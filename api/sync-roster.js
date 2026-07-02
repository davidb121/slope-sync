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
    students: { imported: [], flagged: [] },
    assignments: { created: 0, skipped: 0 },
  }

  // 1. Upsert instructors
  if (roster.instructors?.length) {
    const rows = roster.instructors.map((i) => ({
      external_id: i.externalId,
      full_name: i.fullName,
      disciplines: i.disciplines,
      cert_level: i.certLevel ?? null,
      meeting_zone: i.meetingZone ?? null,
    }))
    const { error } = await supabase
      .from('instructors')
      .upsert(rows, { onConflict: 'external_id' })
    if (error) return res.status(500).json({ error: error.message })
    results.instructors.upserted = rows.length
  }

  // 2. Fetch level map once for all student lookups
  const { data: levels, error: levelsErr } = await supabase
    .from('lesson_levels')
    .select('id, code')
  if (levelsErr) return res.status(500).json({ error: levelsErr.message })
  const levelMap = Object.fromEntries(levels.map((l) => [l.code, l.id]))

  // 3. Upsert students, flagging rule violations
  for (const s of roster.students ?? []) {
    const violation = validateStudent(s)
    if (violation) {
      results.students.flagged.push({ externalId: s.externalId, name: `${s.firstName} ${s.lastName}`, reason: violation })
      continue
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

  // 4. Create pre-assignments (skip if active assignment already exists)
  if (roster.assignments?.length) {
    const { data: instructors } = await supabase.from('instructors').select('id, external_id')
    const { data: students } = await supabase.from('students').select('id, external_id')
    const instrMap = Object.fromEntries(instructors.map((i) => [i.external_id, i.id]))
    const studMap = Object.fromEntries(students.map((s) => [s.external_id, s.id]))

    for (const a of roster.assignments) {
      const studentId = studMap[a.studentExternalId]
      const instructorId = instrMap[a.instructorExternalId]
      if (!studentId || !instructorId) {
        results.assignments.skipped++
        continue
      }

      const { error } = await supabase.from('assignments').insert({
        student_id: studentId,
        instructor_id: instructorId,
        status: 'active',
      })

      // 23505 = unique_violation: student already has an active assignment (idempotent re-run)
      if (error && error.code !== '23505') {
        return res.status(500).json({ error: error.message })
      }
      error ? results.assignments.skipped++ : results.assignments.created++
    }
  }

  return res.status(200).json(results)
}

async function fetchRoster(req) {
  if (process.env.USE_STATIC_SEED === 'true') {
    const seedPath = join(__dirname, '..', 'data', 'seed.json')
    return JSON.parse(readFileSync(seedPath, 'utf8'))
  }

  // Phase 4: live Lucee endpoint
  const date = (req.query?.date) || new Date().toISOString().slice(0, 10)
  const url = `${process.env.ROSTER_API_URL}?date=${date}&key=${process.env.ROSTER_API_KEY}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Roster API returned ${resp.status}`)
  return resp.json()
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
