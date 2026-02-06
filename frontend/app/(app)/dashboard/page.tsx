"use client";

import { useState, useMemo } from "react";
import { StatCard, CButton } from "@/components/climb/ui";
import { ProjectCard } from "@/components/climb/dashboard/project-card";
import { ActivityFeed } from "@/components/climb/dashboard/activity-feed";
import {
  PlusIcon,
  VoxelIcon,
  ChartUpIcon,
  BrainIcon,
  MountainIcon,
} from "@/components/climb/icons";
import {
  getAllProjects,
  getProjectStats,
  type ProjectStatus,
  type ProjectSummary,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type FilterTab = "active" | "finished" | "inactive" | "all";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "finished", label: "Finished" },
  { id: "inactive", label: "Inactive" },
  { id: "all", label: "All Projects" },
];

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("active");

  const allProjects = useMemo(() => getAllProjects(), []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "all") return allProjects;
    return allProjects.filter((p) => p.status === activeFilter);
  }, [activeFilter, allProjects]);

  // Stats always reflect the currently visible projects
  const stats = useMemo(() => getProjectStats(filteredProjects), [filteredProjects]);

  // Counts per status for the tab badges
  const countByStatus = useMemo(() => {
    const counts: Record<FilterTab, number> = { active: 0, finished: 0, inactive: 0, all: allProjects.length };
    for (const p of allProjects) {
      counts[p.status as ProjectStatus]++;
    }
    return counts;
  }, [allProjects]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">
            Project Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all mining AOI projects and AI model health.
          </p>
        </div>
        <CButton variant="solid" size="md" className="mt-4 sm:mt-0">
          <PlusIcon className="h-4 w-4" />
          Create New AOI
        </CButton>
      </div>

      {/* Global Statistics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          icon={<MountainIcon className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          label="Total Est. Ore Tonnage"
          value={stats.totalTonnage}
          unit="tonnes"
          icon={<VoxelIcon className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          label="Avg. Model Confidence"
          value={stats.avgConfidence}
          unit="%"
          icon={<BrainIcon className="h-4 w-4" />}
          trend="neutral"
        />
        <StatCard
          label="Active Inferences"
          value={stats.activeInferences}
          icon={<ChartUpIcon className="h-4 w-4" />}
          trend="up"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-climb-fast",
              activeFilter === tab.id
                ? "bg-card text-foreground shadow-climb-1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                activeFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {countByStatus[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Project Grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {activeFilter === "all"
                ? "All Projects"
                : activeFilter === "active"
                  ? "Active Projects"
                  : activeFilter === "finished"
                    ? "Finished Projects"
                    : "Inactive Projects"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
              <MountainIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No {activeFilter} projects found.
              </p>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
