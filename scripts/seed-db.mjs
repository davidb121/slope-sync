// One-shot seed script — run with: node scripts/seed-db.mjs
// Reads .env.local manually (no Vite, no Vercel runtime needed)
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Parse .env.local ourselves
const envLines = readFileSync(join(root, '.env.local'), 'utf8').split('\n')
const env = {}
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const k = trimmed.slice(0, eq).trim()
  const v = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '')
  env[k] = v
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey || serviceKey === 'your-service-role-key') {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const roster   = JSON.parse(readFileSync(join(root, 'data', 'seed.json'), 'utf8'))

console.log(`Seeding for date ${roster.date} …\n`)

// 1. Instructors
const instrRows = roster.instructors.map(i => ({
  external_id: i.externalId,
  full_name:   i.fullName,
  disciplines: i.disciplines,
  cert_level:  i.certLevel ?? null,
}))
const { error: instrErr } = await supabase.from('instructors').upsert(instrRows, { onConflict: 'external_id' })
if (instrErr) { console.error('instructors:', instrErr.message); process.exit(1) }
console.log(`✓ instructors upserted: ${instrRows.length}`)

// 2. Lesson levels map
const { data: levels, error: lvlErr } = await supabase.from('lesson_levels').select('id, code')
if (lvlErr) { console.error('lesson_levels:', lvlErr.message); process.exit(1) }
const levelMap = Object.fromEntries(levels.map(l => [l.code, l.id]))

// 2b. Clear any existing assignments for today so students start unassigned
const { data: todayStudents } = await supabase
  .from('students').select('id').eq('lesson_date', roster.date)
const todayIds = (todayStudents ?? []).map(s => s.id)
if (todayIds.length) {
  const { error: delErr } = await supabase
    .from('assignments').delete().in('student_id', todayIds)
  if (delErr) { console.error('clear assignments:', delErr.message); process.exit(1) }
}
console.log(`✓ assignments cleared for ${roster.date}`)

// 3. Students — warn on rule violations but always import (manager can override)
const imported = [], warned = []
for (const s of roster.students) {
  const violation = validateStudent(s)
  if (violation) warned.push({ id: s.externalId, reason: violation })
  const { error } = await supabase.from('students').upsert({
    external_id:     s.externalId,
    first_name:      s.firstName,
    last_name:       s.lastName,
    age:             s.age,
    booked_level_id: levelMap[s.bookedLevel] ?? null,
    notes:           s.notes || null,
    lesson_date:     roster.date,
  }, { onConflict: 'external_id' })
  if (error) { console.error(`student ${s.externalId}:`, error.message); process.exit(1) }
  imported.push(s.externalId)
}
console.log(`✓ students imported: ${imported.length}`)
if (warned.length) {
  console.log(`⚠ students with warnings: ${warned.length}`)
  for (const w of warned) console.log(`    ${w.id} — ${w.reason}`)
}

// 4. Instructor class assignments (which level each instructor teaches today)
const { data: instrDb } = await supabase.from('instructors').select('id, external_id')
const instrMap = Object.fromEntries(instrDb.map(i => [i.external_id, i.id]))

let classCount = 0
for (const ic of roster.instructorClasses ?? []) {
  const instructorId = instrMap[ic.instructorExternalId]
  const levelId      = levelMap[ic.levelCode]
  if (!instructorId || !levelId) continue
  const { error } = await supabase.from('instructor_classes').upsert(
    { instructor_id: instructorId, level_id: levelId, lesson_date: roster.date },
    { onConflict: 'instructor_id,level_id,lesson_date' }
  )
  if (error) { console.error(`instructor_class:`, error.message); process.exit(1) }
  classCount++
}
console.log(`✓ instructor classes upserted: ${classCount}`)

console.log('\nDone.')

function validateStudent(s) {
  if (s.discipline === 'snowboard' && s.age < 7) return `age ${s.age} below snowboard minimum (7)`
  if (s.discipline === 'ski' && s.age >= 4 && s.age <= 5 && !s.bookedLevel.startsWith('SKI-A-')) return `age ${s.age} (SKI-A band) booked into ${s.bookedLevel}`
  if (s.discipline === 'ski' && s.age >= 6 && s.age <= 12 && !s.bookedLevel.startsWith('SKI-B-')) return `age ${s.age} (SKI-B band) booked into ${s.bookedLevel}`
  return null
}
