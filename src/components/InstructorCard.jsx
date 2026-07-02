import { useState } from 'react'
import { StudentChip } from './StudentChip'
import { classLabel } from '../lib/classLabel'

export function InstructorCard({ instructor, onMultiAssign, onAssign, onVerifyLevel }) {
  const { full_name, assignedLevels, students } = instructor
  const [expanded, setExpanded] = useState(students.length === 0)

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      {/* Header — tappable to expand/collapse when students are assigned */}
      <button
        className="w-full text-left flex items-start gap-2 mb-2 min-h-[44px]"
        onClick={() => students.length > 0 && setExpanded(v => !v)}
        disabled={students.length === 0}
      >
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold leading-tight">{full_name}</div>
          {assignedLevels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {assignedLevels.map(l => (
                <span
                  key={l.id}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-200"
                >
                  {classLabel(l)}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-xs mt-0.5">No class assigned</div>
          )}
        </div>

        {students.length > 0 && (
          <div className="flex items-center gap-1 text-slate-400 text-xs flex-shrink-0 pt-0.5">
            <span>{students.length} student{students.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-500">{expanded ? '▲' : '▼'}</span>
          </div>
        )}
      </button>

      {/* Student list — only when expanded */}
      {expanded && (
        students.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-2">No students assigned yet</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-1">
            {students.map(s => (
              <StudentChip
                key={s.id}
                student={s}
                onAssign={() => onAssign(s, instructor)}
                onVerifyLevel={() => onVerifyLevel(s)}
              />
            ))}
          </div>
        )
      )}

      {expanded && (
        <button
          onClick={() => onMultiAssign(instructor)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 rounded-xl px-3 min-h-[44px] text-sm transition-colors border border-dashed border-slate-700"
        >
          + Assign students
        </button>
      )}
    </div>
  )
}
