import { LevelBadge } from './LevelBadge'

export function StudentChip({ student, onAssign, onVerifyLevel }) {
  const displayLevel = student.verified_level ?? student.booked_level
  const isVerified = !!student.verified_level

  return (
    <button
      className="flex items-center gap-2 bg-slate-700/60 hover:bg-slate-700 rounded-xl px-3 py-2.5 min-h-[48px] w-full text-left transition-colors"
      onClick={() => onAssign(student)}
    >
      <span className="flex-1 min-w-0">
        <span className="text-white text-sm">
          <span className="font-bold">{student.first_name}</span>{' '}
          <span className="font-normal">{student.last_name[0]}.</span>
        </span>
        <span className="text-slate-400 text-xs ml-2">age {student.age}</span>
        {student.notes && (
          <span className="ml-1 text-amber-400 text-xs" title={student.notes}>⚑</span>
        )}
      </span>
      <span
        className="flex-shrink-0"
        title={isVerified ? `Verified: ${displayLevel?.code}` : `Booked: ${displayLevel?.code} (unverified)`}
        onClick={e => { e.stopPropagation(); onVerifyLevel(student) }}
      >
        <LevelBadge code={displayLevel?.code} />
        {isVerified && <span className="ml-0.5 text-emerald-400 text-xs">✓</span>}
      </span>
    </button>
  )
}
