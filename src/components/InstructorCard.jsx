import { StudentChip } from './StudentChip'
import { classLabel } from '../lib/classLabel'

export function InstructorCard({ instructor, onAssign, onVerifyLevel }) {
  const { full_name, assignedLevels, students } = instructor

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-start gap-2 mb-3">
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
      </div>

      {students.length === 0 ? (
        <p className="text-slate-600 text-sm text-center py-3">No students assigned yet</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {students.map(s => (
            <StudentChip
              key={s.id}
              student={s}
              onAssign={() => onAssign(s, instructor)}
              onVerifyLevel={() => onVerifyLevel(s)}
            />
          ))}
        </div>
      )}

      <div className="text-slate-600 text-xs mt-2.5 text-right">
        {students.length} student{students.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
