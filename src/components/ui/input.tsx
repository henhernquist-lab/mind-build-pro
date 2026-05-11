import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Adds the red shake animation + red border. */
  error?: boolean;
  /** Adds a brief green pulse + green border. */
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // base
          "flex h-10 w-full rounded-md px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "bg-background/40 backdrop-blur-md border border-[hsl(var(--foreground)/0.10)]",
          // focus polish — accent border + soft glow + tiny scale (no layout shift)
          "transition-all duration-300 ease-out",
          "focus:outline-none focus:border-[hsl(var(--cyan)/0.55)] focus:shadow-[0_0_0_3px_hsl(var(--cyan)/0.18),0_0_24px_hsl(var(--cyan)/0.18)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // state
          error && "input-error",
          success && "input-success",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
