import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SuggestedPrompts, SUGGESTED_PROMPTS } from "../SuggestedPrompts"

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = props
      return <button {...rest}>{children}</button>
    },
  },
}))

describe("SuggestedPrompts", () => {
  it("renders all 6 prompts", () => {
    render(<SuggestedPrompts onSelect={vi.fn()} />)
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(screen.getByText(prompt)).toBeInTheDocument()
    }
  })

  it("calls onSelect with correct text when clicked", () => {
    const onSelect = vi.fn()
    render(<SuggestedPrompts onSelect={onSelect} />)

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[0]))
    expect(onSelect).toHaveBeenCalledWith(SUGGESTED_PROMPTS[0])

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[3]))
    expect(onSelect).toHaveBeenCalledWith(SUGGESTED_PROMPTS[3])

    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it("renders with grid layout classes", () => {
    const { container } = render(<SuggestedPrompts onSelect={vi.fn()} />)
    const grid = container.querySelector(".grid")
    expect(grid).toBeInTheDocument()
    expect(grid?.className).toContain("grid-cols-2")
    expect(grid?.className).toContain("md:grid-cols-3")
  })

  it("does not call onSelect when disabled", () => {
    const onSelect = vi.fn()
    render(<SuggestedPrompts onSelect={onSelect} disabled />)

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[0]))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
