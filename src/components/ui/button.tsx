import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default = LifeStack primary: cyan→neon shimmer, dark text
        default:
          "btn-shimmer text-[hsl(var(--background))] shadow-[0_8px_24px_-8px_hsl(var(--cyan)/0.55),inset_0_1px_0_rgba(255,255,255,0.30)] hover:shadow-[0_12px_32px_-6px_hsl(var(--cyan)/0.7),0_0_28px_hsl(var(--neon)/0.35)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_8px_24px_-8px_hsl(var(--destructive)/0.55)] hover:bg-destructive/90 hover:shadow-[0_0_24px_hsl(var(--destructive)/0.45)]",
        outline:
          "border border-[hsl(var(--cyan)/0.30)] bg-background/30 backdrop-blur-md text-foreground hover:bg-[hsl(var(--cyan)/0.10)] hover:border-[hsl(var(--cyan)/0.55)] hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-[hsl(var(--cyan)/0.10)] hover:text-foreground",
        link:
          "text-[hsl(var(--cyan))] underline-offset-4 hover:underline",
        premium:
          "btn-shimmer text-[hsl(var(--background))] shadow-[0_8px_28px_-6px_hsl(var(--neon)/0.55)] hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Disable the click ripple effect (default: enabled) */
  noRipple?: boolean;
}

/**
 * Spawn a circular ripple at the click point. Ripple fades out & cleans itself.
 * `prefers-reduced-motion` users get no ripple.
 */
const spawnRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
  if (typeof window === "undefined") return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ripple = document.createElement("span");
  ripple.className = "btn-ripple";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  target.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 650);
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, noRipple, onPointerDown, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!noRipple && !props.disabled) spawnRipple(e);
      onPointerDown?.(e);
    };
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={handlePointerDown as any}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
