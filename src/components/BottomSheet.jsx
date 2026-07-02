export function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-slate-800 rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800 flex items-center justify-between px-5 py-4 border-b border-slate-700 rounded-t-3xl">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 text-xl rounded-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-5 pb-8">{children}</div>
      </div>
    </div>
  )
}
