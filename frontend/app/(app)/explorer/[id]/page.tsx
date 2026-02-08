"use client";

import { useState, useMemo } from "react";
import { use } from "react";
import { SatelliteView } from "@/components/climb/explorer/satellite-view";
import { VoxelView3D } from "@/components/climb/explorer/voxel-view-3d";
import { FloatingTools } from "@/components/climb/explorer/floating-tools";
import { ControlSidebar } from "@/components/climb/explorer/control-sidebar";
import { IntelligencePanel } from "@/components/climb/explorer/intelligence-panel";
import { OperationalCockpit } from "@/components/climb/explorer/operational-cockpit";
import { useProjectDetail, useProjectVoxels } from "@/hooks/use-projects";
import { MountainIcon, ArrowLeftIcon, RecycleIcon } from "@/components/climb/icons";
import { CButton } from "@/components/climb/ui";
import Link from "next/link";

export default function ExplorerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading, isError } = useProjectDetail(id);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-climb-mint" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <MountainIcon className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Project Not Found
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {"The project \""}{id}{"\" could not be loaded or does not exist."}
            </p>
          </div>
          <Link href="/explorer">
            <CButton variant="solid" size="md">
              Back to Explorer
            </CButton>
          </Link>
        </div>
      </div>
    );
  }

  return <ExplorerStudio project={project as any} />;
}

function ExplorerStudio({
  project,
}: {
  project: NonNullable<ReturnType<typeof useProjectDetail>['data']>;
}) {
  // Fetch voxels to determine if they exist
  const { data: voxels } = useProjectVoxels(project?.id || "");

  // Compute hasVoxels: true if inference completed and voxels exist
  const hasVoxels = useMemo(() => {
    if (!project) return false;
    const projectStatus = (project as any).status;
    const hasVoxelData = voxels && Array.isArray(voxels) && voxels.length > 0;
    return projectStatus === 'completed' || hasVoxelData;
  }, [project, voxels]);

  // State: Multi-select minerals (default to first mineral)
  const defaultMinerals = useMemo(() => {
    if (!project?.mineralLayers?.length) return ['Au'];
    return [project.mineralLayers[0].id]; // Start with first mineral selected
  }, [project?.mineralLayers]);

  const [selectedMinerals, setSelectedMinerals] = useState<string[]>(defaultMinerals);
  const [activeLayerId, setActiveLayerId] = useState("satellite");
  const [depthValue, setDepthValue] = useState(25);
  const [opacityValue, setOpacityValue] = useState(0.75);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar: back button + project name */}
      <div className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
        <Link
          href="/explorer"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-climb-fast hover:bg-muted hover:text-foreground"
          aria-label="Back to Explorer"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <MountainIcon className="h-4 w-4 shrink-0 text-climb-mint" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            {project.name}
          </h1>
          <span className="shrink-0 text-xs text-muted-foreground">
            {project.location}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={`/reconciliation/${project.id}`}>
            <CButton variant="outline" size="sm">
              <RecycleIcon className="h-3.5 w-3.5" />
              Reconciliation Lab
            </CButton>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden p-2">
        {/* Left Control Sidebar */}
        <ControlSidebar
          project={project}
          selectedMinerals={selectedMinerals}
          onMineralsChange={setSelectedMinerals}
          activeLayerId={activeLayerId}
          onLayerChange={setActiveLayerId}
          depthValue={depthValue}
          onDepthChange={setDepthValue}
          opacityValue={opacityValue}
          onOpacityChange={setOpacityValue}
          hasVoxels={hasVoxels ?? false}
          className="rounded-lg"
        />

        {/* Main View Area - Conditional Rendering */}
        <div className="relative mx-2 flex-1 overflow-hidden rounded-lg border border-border">
          {activeLayerId === 'satellite' && (
            <SatelliteView
              projectName={project.name}
              center={project.center}
              aoi={project.aoi}
            />
          )}

          {activeLayerId === 'voxel' && (
            <VoxelView3D
              projectName={project.name}
              projectId={project.id}
              selectedMinerals={selectedMinerals}
              depthValue={depthValue}
              opacityValue={opacityValue}
            />
          )}

          {/* Floating Tool Dock (only in satellite view) */}
          {activeLayerId === 'satellite' && (
            <FloatingTools className="absolute left-4 top-4" />
          )}
        </div>

        {/* Right Intelligence Panel */}
        <IntelligencePanel project={project} className="rounded-lg" />
      </div>

      {/* Bottom Operational Cockpit */}
      <div className="px-2 pb-2">
        <OperationalCockpit
          cogDefault={project.cogDefault}
          baseTonnage={project.baseTonnage}
          baseNetValue={project.baseNetValue}
          className="rounded-lg"
        />
      </div>
    </div>
  );
}
