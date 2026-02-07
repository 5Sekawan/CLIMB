"use client";

import { cn } from "@/lib/utils";
import { CBadge } from "@/components/climb/ui";
import {
  MapPinIcon,
  ChevronRightIcon,
  MountainIcon,
} from "@/components/climb/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { ProjectSummary } from "@/lib/mock-data";
import { useUpdateProjectStatus } from "@/hooks/use-projects";
import { ChevronDown } from "lucide-react";

interface ProjectCardProps {
  project: ProjectSummary;
  className?: string;
}

const statusConfig = {
  active: { label: "Active", badgeClass: "bg-climb-mint-subtle text-climb-mint" },
  finished: { label: "Finished", badgeClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  inactive: { label: "Inactive", badgeClass: "bg-muted text-muted-foreground" },
} as const;

export function ProjectCard({ project, className }: ProjectCardProps) {
  const updateStatus = useUpdateProjectStatus();
  const isClickable = project.status !== "inactive";

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: project.id, status });
  };

  const content = (
    <div
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-6 shadow-climb-1 transition-all duration-climb-fast ease-climb-ease",
        isClickable && "hover:shadow-climb-2 hover:border-primary/20",
        project.status === "inactive" && "opacity-60",
        project.status === "finished" && "border-blue-200/40 dark:border-blue-800/30",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              project.status === "active" && "bg-climb-mint-subtle text-climb-mint",
              project.status === "finished" && "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
              project.status === "inactive" && "bg-muted text-muted-foreground",
            )}
          >
            <MountainIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground text-balance">
              {project.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPinIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {project.location}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <CBadge
            variant={project.driftStatus === "stable" ? "stable" : "drifting"}
          >
            {project.driftStatus === "stable" ? "Stable" : "Drifting"}
          </CBadge>
          
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 transition-opacity",
                    statusConfig[project.status].badgeClass,
                  )}
                >
                  {statusConfig[project.status].label}
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
        {project.minerals.map((m) => (
          <span
            key={m}
            className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Est. Tonnage
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {project.estimatedTonnage}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Confidence
          </span>
          <p className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {project.confidence}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[11px] text-muted-foreground">
          Last inference: {project.lastInference}
        </span>
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
    <Link href={`/explorer/${project.id}`} className="block">
      {content}
    </Link>
  );
}
