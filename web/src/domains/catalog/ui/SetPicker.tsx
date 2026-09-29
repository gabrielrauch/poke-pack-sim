import type { SetInfo } from '../model'
import s from './catalog.module.css'

/** Fileira de sets com rolagem horizontal; o escolhido fica marcado com `aria-pressed`. */
export function SetPicker({
  sets,
  selected,
  onSelect,
}: {
  sets: readonly SetInfo[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <nav className={s.picker} aria-label="Coleção">
      {sets.map((set) => (
        <button
          key={set.id}
          type="button"
          className={s.chip}
          aria-pressed={set.id === selected}
          onClick={() => onSelect(set.id)}
        >
          {set.name}
        </button>
      ))}
    </nav>
  )
}
