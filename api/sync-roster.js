import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Service role key required — bypasses RLS for upserts
const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let roster
  try {
    roster = await fetchRoster(req)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  const results = {
    date: roster.date,
    instructors: { upserted: 0 },
    students: { imported: [], warned: [] },
    instructorClasses: { upserted: 0 },
  }

  // 1. Upsert instructors (profile data only — class assignments handled separately)
  if (roster.instructors?.length) {
    const rows = roster.instructors.map((i) => ({
      external_id: i.externalId,
      full_name: i.fullName,
      disciplines: i.disciplines,
      cert_level: i.certLevel ?? null,
    }))
    const { error } = await supabase
      .from('instructors')
      .upsert(rows, { onConflict: 'external_id' })
    if (error) return res.status(500).json({ error: error.message })
    results.instructors.upserted = rows.length
  }

  // 2. Fetch level map once for all student and class lookups
  const { data: levels, error: levelsErr } = await supabase
    .from('lesson_levels')
    .select('id, code')
  if (levelsErr) return res.status(500).json({ error: levelsErr.message })
  const levelMap = Object.fromEntries(levels.map((l) => [l.code, l.id]))

  // 3. Upsert students — warn on rule violations but always import (manager can override)
  for (const s of roster.students ?? []) {
    const violation = validateStudent(s)
    if (violation) {
      results.students.warned.push({ externalId: s.externalId, name: `${s.firstName} ${s.lastName}`, reason: violation })
    }

    const row = {
      external_id: s.externalId,
      first_name: s.firstName,
      last_name: s.lastName,
      age: s.age,
      booked_level_id: levelMap[s.bookedLevel] ?? null,
      notes: s.notes || null,
      lesson_date: roster.date,
    }
    const { error } = await supabase
      .from('students')
      .upsert(row, { onConflict: 'external_id' })
    if (error) return res.status(500).json({ error: error.message })
    results.students.imported.push(s.externalId)
  }

  // 4. Upsert instructor class assignments for the day
  if (roster.instructorClasses?.length) {
    const { data: instructors } = await supabase.from('instructors').select('id, external_id')
    const instrMap = Object.fromEntries(instructors.map((i) => [i.external_id, i.id]))

    for (const ic of roster.instructorClasses) {
      const instructorId = instrMap[ic.instructorExternalId]
      const levelId = levelMap[ic.levelCode]
      if (!instructorId || !levelId) continue

      const { error } = await supabase
        .from('instructor_classes')
        .upsert(
          { instructor_id: instructorId, level_id: levelId, lesson_date: roster.date },
          { onConflict: 'instructor_id,level_id,lesson_date' }
        )
      if (error) return res.status(500).json({ error: error.message })
      results.instructorClasses.upserted++
    }
  }

  return res.status(200).json(results)
}

async function fetchRoster(req) {
  if (process.env.USE_STATIC_SEED === 'true') {
    const seedPath = join(__dirname, '..', 'data', 'seed.json')
    return JSON.parse(readFileSync(seedPath, 'utf8'))
  }

  // Phase 4: live Lucee endpoints
  const date = (req.query?.date) || new Date().toISOString().slice(0, 10)
  const [instrRes, studRes] = await Promise.all([
    fetch(`${process.env.INSTRUCTOR_API_URL}?date=${date}&key=${process.env.ROSTER_API_KEY}`),
    fetch(`${process.env.STUDENT_API_URL}?date=${date}&key=${process.env.ROSTER_API_KEY}`),
  ])
  if (!instrRes.ok) throw new Error(`Instructor API returned ${instrRes.status}`)
  if (!studRes.ok)  throw new Error(`Student API returned ${studRes.status}`)
  const [instrData, studData] = await Promise.all([instrRes.json(), studRes.json()])
  return { date, instructors: instrData.instructors, instructorClasses: instrData.instructorClasses, students: studData.students }
}

// Returns a violation string, or null if the student is valid
function validateStudent(s) {
  if (s.discipline === 'snowboard' && s.age < 7) {
    return `Age ${s.age} is below snowboard minimum (7)`
  }
  if (s.discipline === 'ski' && s.age >= 4 && s.age <= 5 && !s.bookedLevel.startsWith('SKI-A-')) {
    return `Age ${s.age} (SKI-A band) booked into ${s.bookedLevel}`
  }
  if (s.discipline === 'ski' && s.age >= 6 && s.age <= 12 && !s.bookedLevel.startsWith('SKI-B-')) {
    return `Age ${s.age} (SKI-B band) booked into ${s.bookedLevel}`
  }
  return null
}
