import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { LevelBadge } from '../components/LevelBadge'
import { InitialAssignSheet } from '../components/InitialAssignSheet'
import { studentLevelLabel } from '../lib/classLabel'

export default function ArrivingPage() {
  const navigate = useNavigate()
  const { instructors, unassignedStudents, loading, error } = useRoster()
  const [assignStudent, setAssignStudent] = useState(null)

  const sorted = useMemo(() =>
    [...unassignedStudents].sort((a, b) => {
      const la = a.booked_level?.sort_order ?? 999
      const lb = b.booked_level?.sort_order ?? 999
      if (la !== lb) return la - lb
      return a.first_name.localeCompare(b.first_name)
    }),
    [unassignedStudents]
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white text-xl rounded-lg"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-lg leading-tight">Arriving</div>
          {!loading && (
            <div className="text-slate-400 text-xs">{sorted.length} unassigned</div>
          )}
        </div>
      </header>

      <main className="px-4 py-4">
        {loading && (
          <div className="text-slate-400 text-center py-16 text-sm">Loading…</div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="text-slate-500 text-center py-16 text-sm">
            All students have been assigned.
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {sorted.map(s => (
              <button
                key={s.id}
                onClick={() => setAssignStudent(s)}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 rounded-xl px-4 py-3 min-h-[52px] w-full text-left transition-colors border border-slate-700"
              >
                <span className="flex-1 min-w-0">
                  <span className="text-white font-bold text-sm">{s.first_name}</span>
                  <span className="text-white text-sm font-normal"> {s.last_name[0]}.</span>
                  <span className="text-slate-400 text-xs ml-2">age {s.age}</span>
                  {s.notes && (
                    <span className="ml-1 text-amber-400 text-xs" title={s.notes}>⚑</span>
                  )}
                </span>
                <LevelBadge code={s.booked_level?.code} label={studentLevelLabel(s.booked_level)} />
              </button>
            ))}
          </div>
        )}
      </main>

      <InitialAssignSheet
        student={assignStudent}
        instructors={instructors}
        onClose={() => setAssignStudent(null)}
        onDone={() => {
          setAssignStudent(null)
          // If all assigned, go back automatically
          if (unassignedStudents.length <= 1) navigate(-1)
        }}
      />
    </div>
  )
}
