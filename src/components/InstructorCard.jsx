import { StudentChip } from './StudentChip'

const DISC_COLOR = {
  ski:       'bg-blue-900 text-blue-300',
  snowboard: 'bg-violet-900 text-violet-300',
}

export function InstructorCard({ instructor, onAssign, onVerifyLevel }) {
  const { full_name, disciplines, cert_level, assignedLevels, students } = instructor

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold leading-tight">{full_name}</div>
          <div className="text-slate-400 text-xs mt-0.5">{cert_level}</div>
          {assignedLevels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {assignedLevels.map(l => (
                <span
                  key={l.id}
                  className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200"
                >
                  {l.code}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 mt-0.5">
          {disciplines.map(d => (
            <span key={d} className={`text-xs font-bold px-1.5 py-0.5 rounded ${DISC_COLOR[d] ?? 'bg-slate-700 text-slate-300'}`}>
              {d === 'ski' ? 'SKI' : 'SBD'}
            </span>
          ))}
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
