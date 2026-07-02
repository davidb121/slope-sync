const COLORS = {
  'SKI-A-1': 'bg-amber-800 text-amber-100',
  'SKI-A-2': 'bg-amber-600 text-white',
  'SKI-A-3': 'bg-amber-500 text-white',
  'SKI-A-4': 'bg-amber-400 text-amber-900',
  'SKI-B-1': 'bg-blue-900 text-blue-200',
  'SKI-B-2': 'bg-blue-700 text-white',
  'SKI-B-3': 'bg-blue-500 text-white',
  'SKI-B-4': 'bg-blue-400 text-blue-900',
  'SBD-1':   'bg-violet-900 text-violet-200',
  'SBD-2':   'bg-violet-700 text-white',
  'SBD-3':   'bg-violet-500 text-white',
  'SBD-4':   'bg-violet-300 text-violet-900',
}

export function LevelBadge({ code, size = 'sm', selected = false }) {
  const base = COLORS[code] ?? 'bg-slate-600 text-slate-200'
  const ring = selected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''
  if (size === 'lg') {
    return (
      <span className={`${base} ${ring} font-bold text-sm px-3 py-2 rounded-xl min-h-[44px] min-w-[64px] flex items-center justify-center`}>
        {code ?? '—'}
      </span>
    )
  }
  return (
    <span className={`${base} ${ring} font-bold text-xs px-2 py-0.5 rounded`}>
      {code ?? '—'}
    </span>
  )
}
