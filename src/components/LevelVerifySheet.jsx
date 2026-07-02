import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BottomSheet } from './BottomSheet'
import { LevelBadge } from './LevelBadge'
import { studentLevelLabel } from '../lib/classLabel'

function ageBand(age, discipline) {
  if (discipline === 'snowboard') return 'SBD'
  return age <= 5 ? 'SKI-A' : 'SKI-B'
}

export function LevelVerifySheet({ student, levels, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const [pendingLevelId, setPendingLevelId] = useState(null)
  const [error, setError] = useState(null)

  if (!student || !levels?.length) return null

  const displayLevel = student.verified_level ?? student.booked_level
  const discipline   = displayLevel?.discipline ?? 'ski'
  const band         = ageBand(student.age, discipline)
  const bandLevels   = levels.filter(l => l.code.startsWith(band)).sort((a, b) => a.sort_order - b.sort_order)

  const currentLevelId = student.verified_level?.id ?? student.booked_level?.id
  const currentLevel   = bandLevels.find(l => l.id === currentLevelId)
  const pendingLevel   = bandLevels.find(l => l.id === pendingLevelId)
  const jump           = (pendingLevel && currentLevel) ? Math.abs(pendingLevel.level - currentLevel.level) : 0
  const isBigJump      = jump > 1

  async function handleConfirm() {
    if (!pendingLevelId || pendingLevelId === currentLevelId) { onClose(); return }
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from('students')
      .update({ verified_level_id: pendingLevelId })
      .eq('id', student.id)
    if (err) { setError(err.message); setSubmitting(false); return }
    onDone()
    onClose()
  }

  const unchanged = pendingLevelId === currentLevelId || pendingLevelId === null

  return (
    <BottomSheet
      open={!!student}
      onClose={onClose}
      title="Verify Level"
    >
      <div className="text-slate-300 text-sm mb-1">
        {student.first_name} {student.last_name} · age {student.age}
      </div>
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-400">
        <span>Booked:</span>
        <LevelBadge code={student.booked_level?.code} label={studentLevelLabel(student.booked_level)} />
        {student.verified_level && (
          <>
            <span className="ml-2">Verified:</span>
            <LevelBadge code={student.verified_level.code} label={studentLevelLabel(student.verified_level)} />
            <span className="text-emerald-400">✓</span>
          </>
        )}
      </div>

      <p className="text-slate-300 text-sm font-medium mb-3">Set verified level</p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {bandLevels.map(l => (
          <button
            key={l.id}
            onClick={() => setPendingLevelId(l.id)}
            className="flex justify-center"
          >
            <LevelBadge
              code={l.code}
              label={studentLevelLabel(l)}
              size="lg"
              selected={pendingLevelId ? pendingLevelId === l.id : currentLevelId === l.id}
            />
          </button>
        ))}
      </div>

      {isBigJump && (
        <div className="bg-amber-950/60 border border-amber-700 rounded-xl px-4 py-3 mb-4 text-amber-300 text-sm">
          ⚠️ Big jump ({jump} levels) — confirm you've assessed this student.
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={unchanged || submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 min-h-[56px] transition-colors"
      >
        {submitting
          ? 'Saving…'
          : unchanged
            ? 'No change'
            : `Set to ${studentLevelLabel(pendingLevel)}`}
      </button>
    </BottomSheet>
  )
}
