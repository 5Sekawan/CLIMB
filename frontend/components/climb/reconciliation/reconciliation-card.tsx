"use client";

import { cn } from "@/lib/utils";
import { CBadge } from "@/components/climb/ui";
import {
  RecycleIcon,
  MapPinIcon,
  ChevronRightIcon,
  ChartUpIcon,
  BrainIcon,
  ActivityIcon,
} from "@/components/climb/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { ReconciliationSummary } from "@/lib/mock-data";
import { useUpdateProjectStatus } from "@/hooks/use-projects";
import { ChevronDown } from "lucide-react";

interface ReconciliationCardProps {
  data: ReconciliationSummary;
  className?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    badgeClass: "bg-climb-mint-subtle text-climb-mint",
  },
  finished: {
    label: "Finished",
    badgeClass:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  inactive: {
    label: "Inactive",
    badgeClass: "bg-muted text-muted-foreground",
  },
} as const;

export function ReconciliationCard({
  data,
  className,
}: ReconciliationCardProps) {
  const updateStatus = useUpdateProjectStatus();
  const isClickable = data.status !== "inactive";

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: data.projectId, status });
  };

  const content = (
    <div
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-6 shadow-climb-1 transition-all duration-climb-fast ease-climb-ease",
        isClickable && "hover:shadow-climb-2 hover:border-primary/20",
        data.status === "inactive" && "opacity-60",
        data.status === "finished" &&
          "border-blue-200/40 dark:border-blue-800/30",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              data.status === "active" &&
                "bg-climb-mint-subtle text-climb-mint",
              data.status === "finished" &&
                "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
              data.status === "inactive" && "bg-muted text-muted-foreground",
            )}
          >
            <RecycleIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground text-balance">
              {data.projectName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1">
              <MapPinIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {data.location}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <CBadge
            variant={data.driftStatus === "stable" ? "stable" : "drifting"}
          >
            {data.driftStatus === "stable" ? "Stable" : "Drifting"}
          </CBadge>
          
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 transition-opacity",
                    statusConfig[data.status].badgeClass,
                  )}
                >
                  {statusConfig[data.status].label}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("finished")}>
                  Finished
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("inactive")}>
                  Inactive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Minerals */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {data.minerals.map((m) => (
          <span
            key={m}
            className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Reconciliation Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <ChartUpIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Avg. Variance
            </span>
          </div>
          <p
            className={cn(
              "font-mono text-sm font-semibold",
              data.avgVariance > 0
                ? "text-blue-500"
                : data.avgVariance < -0.3
                  ? "text-climb-drifting"
                  : "text-foreground",
            )}
          >
            {data.avgVariance > 0 ? "+" : ""}
            {data.avgVariance.toFixed(2)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <ActivityIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Blocks
            </span>
          </div>
          <p className="font-mono text-sm font-semibold text-foreground">
            {data.blocksAnalyzed}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <BrainIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Bias
            </span>
          </div>
          <p className="font-mono text-xs font-semibold text-foreground leading-5">
            {data.modelBias === "over-estimation"
              ? "Over-est."
              : data.modelBias === "under-estimation"
                ? "Under-est."
                : "Balanced"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            {data.blocksDrifting} drifting / {data.blocksStable} stable
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span>{data.lessonsInjected} lessons</span>
        </div>
        {isClickable && (
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform duration-climb-fast group-hover:translate-x-0.5 group-hover:text-primary" />
        )}
      </div>
    </div>
  );

  if (!isClickable) {
    return content;
  }

  return (
    <Link href={`/reconciliation/${data.projectId}`} className="block">
      {content}
    </Link>
  );
}
