import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-gold",
        secondary: "border-transparent bg-white/[0.06] text-white/80",
        success: "border-transparent bg-success/15 text-emerald-400",
        destructive: "border-transparent bg-destructive/15 text-red-400",
        warning: "border-transparent bg-warning/15 text-amber-400",
        outline: "border-white/15 text-white/70",
        gold: "border-gold/30 bg-gold/10 text-gold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
