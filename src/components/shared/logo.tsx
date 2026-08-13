import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-xl bg-gold-gradient opacity-90 blur-[2px]" />
        <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-navy-gradient border border-gold/40">
          <svg
            viewBox="0 0 32 32"
            className="h-6 w-6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 24 L13 11 L19 18 L26 7"
              stroke="url(#nv-gold)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 24 L13 11 L17 17"
              stroke="url(#nv-gold)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="nv-gold" x1="6" y1="24" x2="26" y2="7" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFD54F" />
                <stop offset="1" stopColor="#F4B400" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Poly<span className="text-gradient-gold">chain</span>{" "}
            <span className="text-gradient-gold">Capital</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
            Invest Smarter
          </span>
        </div>
      )}
    </div>
  );
}
