"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4242] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#ef4242] text-white hover:bg-[#dd3030] shadow-[0_0_20px_rgba(239,66,66,0.35)] hover:shadow-[0_0_30px_rgba(239,66,66,0.55)]",
        outline:
          "border border-[rgba(239,66,66,0.4)] text-[#ef4242] bg-transparent hover:bg-[rgba(239,66,66,0.08)] hover:border-[#ef4242]",
        ghost:
          "text-white/70 hover:text-white hover:bg-white/5",
        glass:
          "bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur-sm",
        link:
          "text-[#ef4242] underline-offset-4 hover:underline p-0 h-auto",
        destructive:
          "bg-red-900/40 text-red-400 border border-red-900/60 hover:bg-red-900/60",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-sm",
        sm: "h-8 px-3 text-xs rounded-sm",
        lg: "h-12 px-8 text-base rounded-sm",
        xl: "h-14 px-10 text-base rounded-sm",
        icon: "h-10 w-10 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
