import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { SuggestedPrompts, SUGGESTED_PROMPTS } from "../SuggestedPrompts"

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, whileHover, whileTap, initial, animate, exit, transition, ...props }: PropsWithChildren<Record<string, unknown>>) => {
      void whileHover
      void whileTap
      void initial
      void animate
      void exit
      void transition
      return <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
    },
  },
}))

describe("SuggestedPrompts", () => {
  it("renders all prompts", () => {
    render(<SuggestedPrompts onSelect={vi.fn()} />)
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(screen.getByText(prompt)).toBeInTheDocument()
    }
  })

  it("calls onSelect with correct text when clicked", () => {
    const onSelect = vi.fn()
    render(<SuggestedPrompts onSelect={onSelect} />)

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[0]!))
    expect(onSelect).toHaveBeenCalledWith(SUGGESTED_PROMPTS[0]!)

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[2]!))
    expect(onSelect).toHaveBeenCalledWith(SUGGESTED_PROMPTS[2]!)

    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it("renders with flex layout classes", () => {
    const { container } = render(<SuggestedPrompts onSelect={vi.fn()} />)
    const wrapper = container.firstElementChild
    expect(wrapper).toBeInTheDocument()
    expect(wrapper?.className).toContain("flex")
    expect(wrapper?.className).toContain("flex-wrap")
  })

  it("does not call onSelect when disabled", () => {
    const onSelect = vi.fn()
    render(<SuggestedPrompts onSelect={onSelect} disabled />)

    fireEvent.click(screen.getByText(SUGGESTED_PROMPTS[0]!))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
