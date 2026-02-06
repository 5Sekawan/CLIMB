"use client";

import { useMemo } from "react";
import { StatCard } from "@/components/climb/ui";
import { ActivityFeed } from "@/components/climb/dashboard/activity-feed";
import {
  VoxelIcon,
  ChartUpIcon,
  BrainIcon,
  MountainIcon,
} from "@/components/climb/icons";
import { getAllProjects, getProjectStats } from "@/lib/mock-data";

export default function DashboardPage() {
  const allProjects = useMemo(() => getAllProjects(), []);
  const stats = useMemo(() => getProjectStats(allProjects), [allProjects]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">
          Project Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of all mining AOI projects and AI model health.
        </p>
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

      {/* Activity Feed - full width */}
      <div className="mt-8">
        <ActivityFeed />
      </div>
    </div>
  );
}
