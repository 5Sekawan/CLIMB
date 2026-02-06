"use client";

import { cn } from "@/lib/utils";
import { BrainIcon, ActivityIcon, RecycleIcon } from "@/components/climb/icons";
import { getRecentActivity } from "@/lib/mock-data";

const activityData = getRecentActivity();

const iconMap = {
  inference: <BrainIcon className="h-4 w-4" />,
  production: <ActivityIcon className="h-4 w-4" />,
  reconciliation: <RecycleIcon className="h-4 w-4" />,
};

const colorMap = {
  inference: "text-climb-mint bg-climb-mint-subtle",
  production: "text-climb-lime bg-lime-50 dark:bg-lime-950/30",
  reconciliation: "text-climb-marginal bg-amber-50 dark:bg-amber-950/30",
};

export function ActivityFeed({ className }: { className?: string }) {
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
          {activityData.length} events
        </span>
      </div>
      <div className="divide-y divide-border">
        {activityData.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-6 py-3.5 transition-colors duration-climb-fast hover:bg-muted/50"
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                colorMap[item.type],
              )}
            >
              {iconMap[item.type]}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                {item.message}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {item.projectName}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {item.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
