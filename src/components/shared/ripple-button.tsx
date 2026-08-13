"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export function RippleButton({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; size: number; id: number }>>([]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = ref.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, size, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  }, []);

  return (
    <button
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      onClick={(e) => {
        createRipple(e);
        onClick?.(e);
      }}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animation: "ripple 650ms ease-out",
          }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
