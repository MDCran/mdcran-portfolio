import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase transition-all",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(239,66,66,0.35)] text-[#ef4242] bg-[rgba(239,66,66,0.08)] rounded-sm",
        secondary:
          "border border-white/10 text-white/60 bg-white/5 rounded-sm",
        outline:
          "border border-white/15 text-white/70 rounded-sm",
        green:
          "border border-green-500/30 text-green-400 bg-green-500/8 rounded-sm",
        yellow:
          "border border-yellow-500/30 text-yellow-400 bg-yellow-500/8 rounded-sm",
        red:
          "border border-red-500/30 text-red-400 bg-red-500/8 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
