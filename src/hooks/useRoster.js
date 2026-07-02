import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const today = new Date().toISOString().slice(0, 10)

export function useRoster() {
  const [instructors, setInstructors] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRoster = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [instrRes, levelsRes, studRes] = await Promise.all([
      supabase
        .from('instructors')
        .select('id, full_name, disciplines, cert_level, meeting_zone')
        .eq('active', true)
        .order('meeting_zone'),
      supabase
        .from('lesson_levels')
        .select('id, code, label, discipline, age_min, age_max, level, sort_order')
        .order('sort_order'),
      supabase
        .from('students')
        .select(`
          id, first_name, last_name, age, notes,
          booked_level:lesson_levels!booked_level_id(id, code, label, discipline, level, sort_order),
          verified_level:lesson_levels!verified_level_id(id, code, label, discipline, level, sort_order)
        `)
        .eq('lesson_date', today),
    ])

    if (instrRes.error)  { setError(instrRes.error.message);  setLoading(false); return }
    if (levelsRes.error) { setError(levelsRes.error.message); setLoading(false); return }
    if (studRes.error)   { setError(studRes.error.message);   setLoading(false); return }

    const studentIds = studRes.data.map(s => s.id)

    const { data: assignData, error: assignErr } = await supabase
      .from('assignments')
      .select('id, instructor_id, student_id')
      .eq('status', 'active')
      .in('student_id', studentIds.length ? studentIds : ['__none__'])

    if (assignErr) { setError(assignErr.message); setLoading(false); return }

    const studentMap = Object.fromEntries(studRes.data.map(s => [s.id, s]))

    const grouped = {}
    for (const a of assignData ?? []) {
      if (!grouped[a.instructor_id]) grouped[a.instructor_id] = []
      const stu = studentMap[a.student_id]
      if (stu) grouped[a.instructor_id].push({ ...stu, assignmentId: a.id })
    }

    setInstructors(instrRes.data.map(i => ({ ...i, students: grouped[i.id] ?? [] })))
    setLevels(levelsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRoster()

    const channel = supabase
      .channel('roster-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchRoster)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, fetchRoster)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchRoster])

  return { instructors, levels, loading, error, refetch: fetchRoster }
}
