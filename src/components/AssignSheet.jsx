import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BottomSheet } from './BottomSheet'
import { LevelBadge } from './LevelBadge'

const REASONS = [
  'Ability too high',
  'Ability too low',
  'Group size',
  'Language barrier',
  'Medical / special need',
  'Parent request',
  'Other',
]

export function AssignSheet({ student, currentInstructor, allInstructors, onClose, onDone }) {
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!student) return null

  const displayLevel = student.verified_level ?? student.booked_level
  const discipline   = displayLevel?.discipline ?? (displayLevel?.code?.startsWith('SBD') ? 'snowboard' : 'ski')

  const compatible = allInstructors.filter(i =>
    i.id !== currentInstructor?.id &&
    i.disciplines.includes(discipline)
  )

  const effectiveReason = reason === 'Other' ? customReason.trim() : reason
  const canSubmit = target && effectiveReason

  async function handleMove() {
    setSubmitting(true)
    setError(null)
    try {
      const { error: closeErr } = await supabase
        .from('assignments')
        .update({ status: 'moved', ended_at: new Date().toISOString(), reason: effectiveReason })
        .eq('id', student.assignmentId)
      if (closeErr) throw closeErr

      const { error: insertErr } = await supabase
        .from('assignments')
        .insert({ student_id: student.id, instructor_id: target.id, status: 'active' })
      if (insertErr) throw insertErr

      onDone()
      onClose()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet
      open={!!student}
      onClose={onClose}
      title={`${student.first_name} ${student.last_name}`}
    >
      {/* Student summary */}
      <div className="flex items-center gap-3 mb-5 bg-slate-700/50 rounded-xl p-3">
        <div className="flex-1">
          <div className="text-slate-300 text-sm">Age {student.age}</div>
          {student.notes && <div className="text-amber-400 text-xs mt-0.5">⚑ {student.notes}</div>}
        </div>
        <LevelBadge code={displayLevel?.code} />
      </div>

      <div className="text-slate-400 text-xs mb-1">
        Currently with <span className="text-white font-medium">{currentInstructor?.full_name}</span>
      </div>

      {/* Instructor picker */}
      <p className="text-slate-300 text-sm font-medium mt-4 mb-2">Move to</p>
      <div className="flex flex-col gap-2 mb-5">
        {compatible.length === 0 && (
          <p className="text-slate-500 text-sm">No other compatible instructors available.</p>
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
            <span className="flex-1">
              <span className="font-medium text-sm">{i.full_name}</span>
              <span className="text-slate-400 text-xs ml-2">Zone {i.meeting_zone}</span>
            </span>
            {target?.id === i.id && <span className="text-blue-400 text-lg">✓</span>}
          </button>
        ))}
      </div>

      {/* Reason chips — only show once target is selected */}
      {target && (
        <>
          <p className="text-slate-300 text-sm font-medium mb-2">Reason</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-3 py-2 rounded-xl text-sm min-h-[40px] transition-colors ${
                  reason === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === 'Other' && (
            <input
              autoFocus
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Describe reason…"
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
            />
          )}
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <button
        onClick={handleMove}
        disabled={!canSubmit || submitting}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 min-h-[56px] transition-colors"
      >
        {submitting ? 'Moving…' : `Move to ${target?.full_name ?? '…'}`}
      </button>
    </BottomSheet>
  )
}
