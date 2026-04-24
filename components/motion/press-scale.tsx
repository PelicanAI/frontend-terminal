"use client"

import { m } from "framer-motion"
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { DURATION, EASING, useReducedMotion } from "@/lib/motion"

interface PressScaleProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
> {
  pressScale?: number
  hoverScale?: number
  disabled?: boolean
  children: ReactNode
}

export const PressScale = forwardRef<HTMLDivElement, PressScaleProps>(
  (
    {
      pressScale = 0.97,
      hoverScale = 1.01,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    const reducedMotion = useReducedMotion()
    const skipAnimation = reducedMotion || disabled

    return (
      <m.div
        ref={ref}
        whileTap={skipAnimation ? undefined : { scale: pressScale }}
        whileHover={skipAnimation ? undefined : { scale: hoverScale }}
        transition={{ duration: DURATION.micro, ease: EASING.standard }}
        className={`${disabled ? "pointer-events-none opacity-60" : ""} ${className}`}
        {...rest}
      >
        {children}
      </m.div>
    )
  },
)

PressScale.displayName = "PressScale"
