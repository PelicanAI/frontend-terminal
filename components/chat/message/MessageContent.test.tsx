import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { forwardRef, type ReactNode } from "react"
import { MessageContent } from "./message-content"

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: forwardRef<HTMLDivElement, React.PropsWithChildren<Record<string, unknown>>>(
      function MockMotionDiv({ children, initial, animate, exit, transition, ...props }, ref) {
        void initial
        void animate
        void exit
        void transition

        const htmlProps = props as Record<string, unknown>
        const safeProps: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(htmlProps)) {
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            safeProps[key] = value
          }
          if (key === "dangerouslySetInnerHTML") {
            safeProps[key] = value
          }
        }
        return (
          <div ref={ref} {...(safeProps as React.HTMLAttributes<HTMLDivElement>)}>
            {children as ReactNode}
          </div>
        )
      }
    ),
  },
}))

// Mock data-parsers to avoid complex dependency
vi.mock("@/lib/data-parsers", () => ({
  detectDataTable: () => null,
}))

// Mock EnhancedTypingDots
vi.mock("../enhanced-typing-dots", () => ({
  EnhancedTypingDots: () => <div data-testid="typing-dots">Thinking...</div>,
}))

// Mock DataTable
vi.mock("@/components/chat/data-visualizations/data-table", () => ({
  DataTable: () => <div data-testid="data-table">DataTable</div>,
}))

// Mock DOMPurify
vi.mock("isomorphic-dompurify", () => ({
  default: {
    sanitize: (input: string) => input,
  },
}))

describe("MessageContent", () => {
  it("renders text content", () => {
    render(<MessageContent content="Hello world" isStreaming={false} />)
    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("shows typing dots when streaming with no content", () => {
    render(<MessageContent content="" isStreaming={true} />)
    expect(screen.getByTestId("typing-dots")).toBeInTheDocument()
  })

  it("shows skeleton when showSkeleton is true and no content", () => {
    const { container } = render(
      <MessageContent content="" isStreaming={false} showSkeleton={true} />
    )
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument()
  })

  it("shows 'No content' for empty non-streaming message", () => {
    render(<MessageContent content="" isStreaming={false} />)
    expect(screen.getByText("No content")).toBeInTheDocument()
  })

  it("renders code blocks", () => {
    render(
      <MessageContent
        content={"```js\nconsole.log('hi')\n```"}
        isStreaming={false}
      />
    )
    expect(screen.getByText("console.log('hi')")).toBeInTheDocument()
  })

  it("handles non-string content defensively", () => {
    // @ts-expect-error Testing runtime safety with invalid input
    render(<MessageContent content={123} isStreaming={false} />)
    expect(screen.getByText("123")).toBeInTheDocument()
  })
})
