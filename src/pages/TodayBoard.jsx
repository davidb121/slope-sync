import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRoster } from '../hooks/useRoster'
import { InstructorCard } from '../components/InstructorCard'
import { AssignSheet } from '../components/AssignSheet'
import { LevelVerifySheet } from '../components/LevelVerifySheet'

const DATE_LABEL = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function TodayBoard() {
  const { signOut } = useAuth()
  const { instructors, levels, loading, error, refetch } = useRoster()

  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  // AssignSheet state
  const [assignCtx, setAssignCtx] = useState(null) // { student, instructor }
  // LevelVerifySheet state
  const [verifyStudent, setVerifyStudent] = useState(null)

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return instructors
    return instructors
      .map(i => ({
        ...i,
        students: i.students.filter(s =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
        ),
      }))
      .filter(i => i.students.length > 0)
  }, [instructors, search])

  function openAssign(student, instructor) {
    setAssignCtx({ student, instructor })
  }

  function openVerify(student) {
    setVerifyStudent(student)
  }

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
      <main className="px-4 py-4">
        {loading && (
          <div className="text-slate-400 text-center py-16 text-sm">Loading roster…</div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="text-slate-500 text-center py-16 text-sm">
            {search ? 'No students match that name.' : 'No instructors on roster today.'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(instructor => (
            <InstructorCard
              key={instructor.id}
              instructor={instructor}
              onAssign={openAssign}
              onVerifyLevel={openVerify}
            />
          ))}
        </div>

        {/* Summary bar */}
        {!loading && !error && instructors.length > 0 && (
          <div className="mt-6 flex justify-center gap-6 text-xs text-slate-600">
            <span>{instructors.length} instructors</span>
            <span>{instructors.reduce((n, i) => n + i.students.length, 0)} students</span>
          </div>
        )}
      </main>

      {/* Action sheets */}
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
