"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const iconColors: Record<string, string> = {
  gold: "bg-gold/15 text-gold",
  emerald: "bg-emerald-400/15 text-emerald-400",
  sky: "bg-sky-400/15 text-sky-400",
  violet: "bg-violet-400/15 text-violet-400",
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  color = "gold",
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  trend?: string;
  trendLabel?: string;
  color?: keyof typeof iconColors;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card group p-6 transition-all duration-300 hover:border-gold/30 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-white/50">{label}</p>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", iconColors[color])}>
          {icon}
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      {(trend || trendLabel) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && <span className={cn("font-semibold", trend.startsWith("+") ? "text-emerald-400" : trend.startsWith("-") ? "text-red-400" : "text-white/50")}>{trend}</span>}
          {trendLabel && <span className="text-white/40">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
