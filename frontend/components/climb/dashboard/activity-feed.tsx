"use client";

import { cn } from "@/lib/utils";
import { BrainIcon, ActivityIcon, RecycleIcon, SettingsIcon } from "@/components/climb/icons"; // Using SettingsIcon as generic system icon
import { useActivity } from "@/hooks/use-activity";
import { formatDistanceToNow } from "date-fns";
import { SkeletonShimmer } from "@/components/climb/ui";

const iconMap = {
  inference: <BrainIcon className="h-4 w-4" />,
  production: <ActivityIcon className="h-4 w-4" />,
  reconciliation: <RecycleIcon className="h-4 w-4" />,
  system: <SettingsIcon className="h-4 w-4" />,
};

const colorMap = {
  inference: "text-climb-mint bg-climb-mint-subtle",
  production: "text-climb-lime bg-lime-50 dark:bg-lime-950/30",
  reconciliation: "text-climb-marginal bg-amber-50 dark:bg-amber-950/30",
  system: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
};

export function ActivityFeed({ className }: { className?: string }) {
  const { data: activityData, isLoading } = useActivity();

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-card shadow-climb-1 p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          <SkeletonShimmer className="h-4 w-32" />
          <SkeletonShimmer className="h-3 w-16" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <SkeletonShimmer className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonShimmer className="h-3 w-full" />
                <SkeletonShimmer className="h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const logs = activityData || [];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-climb-1",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        <span className="text-xs text-muted-foreground">
          {logs.length} events
        </span>
      </div>
      <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : (
          logs.map((item) => (
            <div
              key={item._id}
              className="flex items-start gap-3 px-6 py-3.5 transition-colors duration-climb-fast hover:bg-muted/50"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  colorMap[item.type] || colorMap.system,
                )}
              >
                {iconMap[item.type] || iconMap.system}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {item.message}
                </p>
                <div className="flex items-center gap-2">
                  {item.projectName && (
                    <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.projectName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}