// For instructor class assignment pills (includes age range to distinguish A vs B band)
export function classLabel(level) {
  if (!level) return ''
  if (level.discipline === 'snowboard') return `Board Level ${level.level}`
  if (level.age_min <= 5) return `Ski Level ${level.level} (4-5)`
  return `Ski Level ${level.level} (6+)`
}

// For student-level display shown alongside age — no age range needed
export function studentLevelLabel(level) {
  if (!level) return ''
  if (level.discipline === 'snowboard') return `Board Level ${level.level}`
  return `Ski Level ${level.level}`
}
