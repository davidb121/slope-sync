import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { BottomSheet } from './BottomSheet'
import { LevelBadge } from './LevelBadge'
import { classLabel, studentLevelLabel } from '../lib/classLabel'

// Lower score = better match for this instructor
function matchScore(studentLevel, instrLevel) {
  if (!instrLevel || !studentLevel) return 999
  if (studentLevel.code === instrLevel.code) return 0
  const sBand = studentLevel.code.startsWith('SBD') ? 'sbd'
              : studentLevel.code.startsWith('SKI-A') ? 'ski-a' : 'ski-b'
  const iBand = instrLevel.code.startsWith('SBD') ? 'sbd'
              : instrLevel.code.startsWith('SKI-A') ? 'ski-a' : 'ski-b'
  if ((sBand === 'sbd') !== (iBand === 'sbd')) return 100  // different discipline
  if (sBand !== iBand) return 10 + Math.abs(studentLevel.level - instrLevel.level)  // wrong age band
  return Math.abs(studentLevel.level - instrLevel.level)   // right band, level distance
}

export function MultiAssignSheet({ instructor, unassignedStudents, onClose, onDone }) {
  const [selected, setSelected] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const instrLevel = instructor?.assignedLevels?.[0]

  const sorted = useMemo(() =>
    [...unassignedStudents].sort((a, b) => {
      const sa = matchScore(a.booked_level, instrLevel)
      const sb = matchScore(b.booked_level, instrLevel)
      if (sa !== sb) return sa - sb
      return a.first_name.localeCompare(b.first_name)
    }),
    [unassignedStudents, instrLevel]
  )

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAssign() {
    if (!selected.size) return
    setSubmitting(true)
    setError(null)
    try {
      const rows = [...selected].map(studentId => ({
        student_id: studentId,
        instructor_id: instructor.id,
        status: 'active',
      }))
      const { error: err } = await supabase.from('assignments').insert(rows)
      if (err) throw err
      onDone()
      onClose()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet open={!!instructor} onClose={onClose} title={instructor?.full_name ?? ''}>
      {instrLevel && (
        <div className="text-slate-400 text-xs mb-4">
          {classLabel(instrLevel)} · {instructor.students.length} student{instructor.students.length !== 1 ? 's' : ''} assigned
        </div>
      )}

      {unassignedStudents.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No unassigned students remaining.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mb-5">
          {sorted.map(s => {
            const score = matchScore(s.booked_level, instrLevel)
            const isSelected = selected.has(s.id)
            const isDifferentDiscipline = score >= 100
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 min-h-[52px] w-full text-left transition-colors border ${
                  isSelected
                    ? 'bg-blue-900/60 border-blue-500'
                    : isDifferentDiscipline
                      ? 'bg-slate-800/30 border-slate-800 opacity-50'
                      : 'bg-slate-700/40 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border ${
                  isSelected ? 'bg-blue-500 border-blue-400' : 'border-slate-500'
                }`}>
                  {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-white font-bold text-sm">{s.first_name}</span>
                  <span className="text-white text-sm font-normal"> {s.last_name[0]}.</span>
                  <span className="text-slate-400 text-xs ml-2">age {s.age}</span>
                  {s.notes && <span className="ml-1 text-amber-400 text-xs" title={s.notes}>⚑</span>}
                </span>
                <LevelBadge code={s.booked_level?.code} label={studentLevelLabel(s.booked_level)} />
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <button
        onClick={handleAssign}
        disabled={selected.size === 0 || submitting}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 min-h-[56px] transition-colors"
      >
        {submitting
          ? 'Assigning…'
          : selected.size === 0
            ? 'Select students above'
            : `Assign ${selected.size} student${selected.size !== 1 ? 's' : ''} to ${instructor?.full_name}`}
      </button>
    </BottomSheet>
  )
}
