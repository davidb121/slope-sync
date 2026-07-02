import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRoster } from '../hooks/useRoster'
import { InstructorCard } from '../components/InstructorCard'
import { AssignSheet } from '../components/AssignSheet'
import { InitialAssignSheet } from '../components/InitialAssignSheet'
import { LevelVerifySheet } from '../components/LevelVerifySheet'
import { LevelBadge } from '../components/LevelBadge'

const DATE_LABEL = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function TodayBoard() {
  const { signOut } = useAuth()
  const { instructors, unassignedStudents, levels, loading, error, refetch } = useRoster()

  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  // Sheet state
  const [assignCtx, setAssignCtx] = useState(null)   // { student, instructor } — reassign
  const [newAssignStudent, setNewAssignStudent] = useState(null) // student — first assign
  const [verifyStudent, setVerifyStudent] = useState(null)

  // Unassigned students sorted by level sort_order then first name
  const sortedUnassigned = useMemo(() =>
    [...unassignedStudents].sort((a, b) => {
      const la = a.booked_level?.sort_order ?? 999
      const lb = b.booked_level?.sort_order ?? 999
      if (la !== lb) return la - lb
      return a.first_name.localeCompare(b.first_name)
    }),
    [unassignedStudents]
  )

  // Filter instructors (and unassigned) by search
  const q = search.trim().toLowerCase()
  const displayedInstructors = useMemo(() => {
    if (!q) return instructors
    return instructors
      .map(i => ({
        ...i,
        students: i.students.filter(s =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
        ),
      }))
      .filter(i => i.students.length > 0)
  }, [instructors, q])

  const displayedUnassigned = useMemo(() => {
    if (!q) return sortedUnassigned
    return sortedUnassigned.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    )
  }, [sortedUnassigned, q])

  const totalStudents = instructors.reduce((n, i) => n + i.students.length, 0) + unassignedStudents.length

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-lg leading-tight">SlopeSync</div>
          <div className="text-slate-400 text-xs">{DATE_LABEL}</div>
        </div>
        <button
          onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearch('') }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white text-xl rounded-lg"
          aria-label="Search"
        >
          {searchOpen ? '✕' : '🔍'}
        </button>
        <button
          onClick={refetch}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white text-xl rounded-lg"
          aria-label="Refresh"
        >
          ↻
        </button>
        <button
          onClick={signOut}
          className="min-h-[44px] px-3 flex items-center text-slate-400 hover:text-white text-sm rounded-lg"
        >
          Out
        </button>
      </header>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800">
          <input
            autoFocus
            type="search"
            placeholder="Search student name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
          />
        </div>
      )}

      {/* Body */}
      <main className="px-4 py-4 space-y-4">
        {loading && (
          <div className="text-slate-400 text-center py-16 text-sm">Loading roster…</div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Arriving students panel */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-semibold text-sm tracking-wide">Arriving</h2>
                {displayedUnassigned.length > 0 ? (
                  <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full">
                    {displayedUnassigned.length} unassigned
                  </span>
                ) : (
                  <span className="text-xs text-emerald-400 font-medium">All assigned ✓</span>
                )}
              </div>

              {displayedUnassigned.length === 0 && !q ? (
                <div className="text-slate-600 text-sm text-center py-4 border border-slate-800 rounded-xl">
                  All students have been assigned
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {displayedUnassigned.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setNewAssignStudent(s)}
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
                      <LevelBadge code={s.booked_level?.code} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Instructor cards */}
            {(displayedInstructors.length > 0 || q) && (
              <section>
                {q && displayedInstructors.length === 0 ? null : (
                  <>
                    <h2 className="text-white font-semibold text-sm tracking-wide mb-2">Instructors</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {displayedInstructors.map(instructor => (
                        <InstructorCard
                          key={instructor.id}
                          instructor={instructor}
                          onAssign={(student, instr) => setAssignCtx({ student, instructor: instr })}
                          onVerifyLevel={setVerifyStudent}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Summary bar */}
            {!q && (
              <div className="flex justify-center gap-6 text-xs text-slate-600 pt-2">
                <span>{instructors.length} instructors</span>
                <span>{totalStudents} students</span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Action sheets */}
      <InitialAssignSheet
        student={newAssignStudent}
        instructors={instructors}
        onClose={() => setNewAssignStudent(null)}
        onDone={refetch}
      />

      <AssignSheet
        student={assignCtx?.student ?? null}
        currentInstructor={assignCtx?.instructor ?? null}
        allInstructors={instructors}
        onClose={() => setAssignCtx(null)}
        onDone={refetch}
      />

      <LevelVerifySheet
        student={verifyStudent}
        levels={levels}
        onClose={() => setVerifyStudent(null)}
        onDone={refetch}
      />
    </div>
  )
}
