import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        premium:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
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
