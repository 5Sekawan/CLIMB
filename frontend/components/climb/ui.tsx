"use client";

import React from "react"

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ─── C-Button ────────────────────────────────────────────────
interface CButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function CButton({
  variant = "solid",
  size = "md",
  className,
  children,
  ...props
}: CButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-climb-fast ease-climb-ease rounded-lg",
        "hover:scale-[1.02] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        // Variants
        variant === "solid" &&
        "bg-primary text-primary-foreground shadow-climb-1 hover:shadow-climb-2 hover:bg-climb-mint-hover",
        variant === "ghost" &&
        "bg-transparent text-foreground hover:bg-muted",
        variant === "danger" &&
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        variant === "outline" &&
        "border border-border bg-transparent text-foreground hover:bg-muted",
        // Sizes
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── C-Badge ─────────────────────────────────────────────────
interface CBadgeProps {
  variant?: "ore" | "waste" | "marginal" | "drifting" | "stable" | "default";
  children: ReactNode;
  className?: string;
}

export function CBadge({
  variant = "default",
  children,
  className,
}: CBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "ore" && "bg-climb-mint-subtle text-climb-mint",
        variant === "waste" && "bg-muted text-climb-waste",
        variant === "marginal" &&
        "bg-amber-50 text-climb-marginal dark:bg-amber-950/30",
        variant === "drifting" &&
        "bg-red-50 text-climb-drifting dark:bg-red-950/30",
        variant === "stable" && "bg-climb-mint-subtle text-climb-stable",
        variant === "default" && "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── C-Slider (Custom Track with Gradient) ───────────────────
interface CSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  className?: string;
  showValue?: boolean;
}

export function CSlider({
  label,
  min,
  max,
  step = 0.01,
  value,
  onChange,
  unit = "",
  className,
  showValue = true,
}: CSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          )}
          {showValue && (
            <span className="font-mono text-xs font-semibold text-foreground animate-count-up">
              {value.toFixed(2)}
              {unit}
            </span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(var(--climb-waste)), hsl(var(--climb-marginal)), hsl(var(--climb-ore)))`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-climb-2 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          aria-label={label}
        />
      </div>
    </div>
  );
}

// ─── C-Input ─────────────────────────────────────────────────
interface CInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function CInput({ label, className, id, ...props }: CInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground transition-colors duration-climb-fast",
          "placeholder:text-muted-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring",
          className
        )}
        {...props}
      />
    </div>
  );
}

// ─── AI Status Badge ─────────────────────────────────────────
interface AIStatusBadgeProps {
  status?: "idle" | "processing" | "complete";
  className?: string;
}

export function AIStatusBadge({
  status = "idle",
  className,
}: AIStatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        status === "idle" && "bg-muted text-muted-foreground",
        status === "processing" &&
        "bg-climb-mint-subtle text-climb-mint animate-ai-pulse",
        status === "complete" && "bg-climb-mint-subtle text-climb-mint",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "idle" && "bg-muted-foreground",
          status === "processing" && "bg-climb-mint animate-ai-pulse",
          status === "complete" && "bg-climb-mint"
        )}
      />
      {status === "idle" && "AI Ready"}
      {status === "processing" && "AI Processing..."}
      {status === "complete" && "AI Complete"}
    </div>
  );
}

// ─── Insight Card (Mintlify Style) ───────────────────────────
interface InsightCardProps {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}

export function InsightCard({
  icon,
  title,
  children,
  className,
}: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-climb-1 transition-shadow duration-climb-fast hover:shadow-climb-2",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-climb-mint-subtle text-climb-mint">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Glass Panel (Map Overlay) ───────────────────────────────
interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-surface rounded-xl p-4 shadow-climb-2",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Skeleton Shimmer ────────────────────────────────────────
interface SkeletonShimmerProps {
  className?: string;
}

export function SkeletonShimmer({ className }: SkeletonShimmerProps) {
  return (
    <div className={cn("animate-shimmer rounded-lg h-4 w-full", className)} />
  );
}

// ─── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-climb-1",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {icon && (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold text-foreground">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
      {trend && (
        <div
          className={cn(
            "text-xs font-medium",
            trend === "up" && "text-climb-mint",
            trend === "down" && "text-climb-drifting",
            trend === "neutral" && "text-muted-foreground"
          )}
        >
          {trend === "up" && "+2.4% from last week"}
          {trend === "down" && "-1.8% from last week"}
          {trend === "neutral" && "No change"}
        </div>
      )}
    </div>
  );
}

// ─── Confidence Gauge ────────────────────────────────────────
interface ConfidenceGaugeProps {
  value: number; // 0 - 100
  label?: string;
  className?: string;
}

export function ConfidenceGauge({
  value,
  label = "Confidence",
  className,
}: ConfidenceGaugeProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  const color =
    value >= 75
      ? "text-climb-mint"
      : value >= 50
        ? "text-climb-marginal"
        : "text-climb-drifting";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className="stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={cn("transition-all duration-climb-smooth", color)}
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-bold text-foreground">
            {value}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Voxel Legend Bar ────────────────────────────────────────
interface VoxelLegendProps {
  mineralName: string;
  unit: string;
  minValue: number;
  maxValue: number;
  className?: string;
}

export function VoxelLegend({
  mineralName,
  unit,
  minValue,
  maxValue,
  className,
}: VoxelLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg bg-card/90 p-3 shadow-climb-2 backdrop-blur-sm",
        className
      )}
    >
      <span className="text-xs font-semibold text-foreground">
        {mineralName} ({unit})
      </span>
      <div className="flex gap-2">
        {/* Gradient bar - Blue (low) → Green (mid) → Red (high) */}
        <div
          className="h-32 w-4 rounded-full"
          style={{
            background: "linear-gradient(to top, rgb(0, 100, 255), rgb(0, 200, 100), rgb(255, 200, 0), rgb(255, 50, 0))",
          }}
        />
        {/* Numeric labels */}
        <div className="flex flex-col justify-between text-[10px] font-mono text-muted-foreground py-0.5">
          <span>{maxValue}</span>
          <span>{((maxValue + minValue) / 2).toFixed(1)}</span>
          <span>{minValue}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Inference Loading Stage ─────────────────────────────────
interface InferenceLoadingProps {
  stages: { label: string; done: boolean }[];
  className?: string;
}

export function InferenceLoading({ stages, className }: InferenceLoadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {stages.map((stage, i) => (
        <div
          key={i}
          className="flex items-center gap-3"
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full shrink-0 transition-colors duration-climb-smooth",
              stage.done ? "bg-climb-mint" : "bg-muted-foreground animate-ai-pulse"
            )}
          />
          <span
            className={cn(
              "text-xs transition-colors duration-climb-smooth",
              stage.done
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  );
}
