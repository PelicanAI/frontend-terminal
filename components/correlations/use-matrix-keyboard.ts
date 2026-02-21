import { useCallback, useState } from 'react'

interface UseMatrixKeyboardProps {
  size: number
  onSelectCell: (row: number, col: number) => void
  onClose: () => void
  enabled: boolean
}

interface UseMatrixKeyboardReturn {
  focusedCell: { row: number; col: number } | null
  handleKeyDown: (e: React.KeyboardEvent) => void
  setFocusedCell: (cell: { row: number; col: number } | null) => void
}

export function useMatrixKeyboard({
  size,
  onSelectCell,
  onClose,
  enabled,
}: UseMatrixKeyboardProps): UseMatrixKeyboardReturn {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || !focusedCell) return

      const { row, col } = focusedCell

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (row > 0) setFocusedCell({ row: row - 1, col })
          break
        case 'ArrowDown':
          e.preventDefault()
          if (row < size - 1) setFocusedCell({ row: row + 1, col })
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (col > 0) setFocusedCell({ row, col: col - 1 })
          break
        case 'ArrowRight':
          e.preventDefault()
          if (col < size - 1) setFocusedCell({ row, col: col + 1 })
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (row !== col) {
            onSelectCell(row, col)
          }
          break
        case 'Escape':
          e.preventDefault()
          setFocusedCell(null)
          onClose()
          break
      }
    },
    [enabled, focusedCell, size, onSelectCell, onClose],
  )

  return {
    focusedCell,
    handleKeyDown,
    setFocusedCell,
  }
}
