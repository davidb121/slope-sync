import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BottomSheet } from './BottomSheet'
import { LevelBadge } from './LevelBadge'
import { classLabel, studentLevelLabel } from '../lib/classLabel'

export function InitialAssignSheet({ student, instructors, onClose, onDone }) {
  const [target, setTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!student) return null

  const displayLevel = student.booked_level
  const discipline = displayLevel?.code?.startsWith('SBD') ? 'snowboard' : 'ski'

  const compatible = instructors.filter(i => i.disciplines.includes(discipline))

  async function handleAssign() {
    if (!target) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('assignments')
        .insert({ student_id: student.id, instructor_id: target.id, status: 'active' })
      if (err) throw err
      onDone()
      onClose()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet open={!!student} onClose={onClose} title={`Assign ${student.first_name} ${student.last_name}`}>
      {/* Student summary */}
      <div className="flex items-center gap-3 mb-5 bg-slate-700/50 rounded-xl p-3">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm">
            <span className="font-bold">{student.first_name}</span>{' '}
            <span className="font-normal">{student.last_name}</span>
          </div>
          <div className="text-slate-400 text-xs mt-0.5">Age {student.age}</div>
          {student.notes && <div className="text-amber-400 text-xs mt-0.5">⚑ {student.notes}</div>}
        </div>
        <LevelBadge code={displayLevel?.code} label={studentLevelLabel(displayLevel)} />
      </div>

      {/* Instructor picker */}
      <p className="text-slate-300 text-sm font-medium mb-2">Assign to</p>
      <div className="flex flex-col gap-2 mb-5">
        {compatible.length === 0 && (
          <p className="text-slate-500 text-sm">No compatible instructors on roster.</p>
        )}
        {compatible.map(i => (
          <button
            key={i.id}
            onClick={() => setTarget(i)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 min-h-[52px] text-left transition-colors border ${
              target?.id === i.id
                ? 'bg-blue-900/60 border-blue-500 text-white'
                : 'bg-slate-700/40 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <span className="flex-1 min-w-0">
              <span className="font-medium text-sm">{i.full_name}</span>
              {i.assignedLevels?.length > 0 && (
                <span className="text-slate-400 text-xs ml-2">{classLabel(i.assignedLevels[0])}</span>
              )}
              <span className="text-slate-500 text-xs ml-2">
                {i.students.length} student{i.students.length !== 1 ? 's' : ''}
              </span>
            </span>
            {target?.id === i.id && <span className="text-blue-400 text-lg">✓</span>}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <button
        onClick={handleAssign}
        disabled={!target || submitting}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 min-h-[56px] transition-colors"
      >
        {submitting ? 'Assigning…' : target ? `Assign to ${target.full_name}` : 'Select an instructor'}
      </button>
    </BottomSheet>
  )
}
