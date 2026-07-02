export function classLabel(level) {
  if (!level) return ''
  if (level.discipline === 'snowboard') return `Board Level ${level.level}`
  if (level.age_min <= 5) return `Ski Level ${level.level} (4-5)`
  return `Ski Level ${level.level} (6+)`
}
