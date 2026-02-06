"use client";

import { useState } from "react";
import { use } from "react";
import { MapCanvas } from "@/components/climb/explorer/map-canvas";
import { FloatingTools } from "@/components/climb/explorer/floating-tools";
import { ControlSidebar } from "@/components/climb/explorer/control-sidebar";
import { IntelligencePanel } from "@/components/climb/explorer/intelligence-panel";
import { OperationalCockpit } from "@/components/climb/explorer/operational-cockpit";
import { getProjectDetail } from "@/lib/mock-data";
import { MountainIcon } from "@/components/climb/icons";
import { CButton } from "@/components/climb/ui";
import Link from "next/link";

export default function ExplorerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = getProjectDetail(id);

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <MountainIcon className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Project Not Found
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {"The project \""}{id}{"\" does not exist or has been removed."}
            </p>
          </div>
          <Link href="/dashboard">
            <CButton variant="solid" size="md">
              Back to Dashboard
            </CButton>
          </Link>
        </div>
      </div>
    );
  }

  return <ExplorerStudio project={project} />;
}

// Separate client component to handle state for the project
function ExplorerStudio({
  project,
}: {
  project: NonNullable<ReturnType<typeof getProjectDetail>>;
}) {
  const defaultMineral = project.mineralLayers[0]?.id ?? "Au";
  const [selectedMineral, setSelectedMineral] = useState(defaultMineral);
  const [depthValue, setDepthValue] = useState(25);
  const [opacityValue, setOpacityValue] = useState(0.75);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Control Sidebar */}
        <ControlSidebar
          project={project}
          selectedMineral={selectedMineral}
          onMineralChange={setSelectedMineral}
          depthValue={depthValue}
          onDepthChange={setDepthValue}
          opacityValue={opacityValue}
          onOpacityChange={setOpacityValue}
        />

        {/* Main Map Area */}
        <div className="relative flex-1">
          <MapCanvas
            selectedMineral={selectedMineral}
            projectName={project.name}
            center={project.center}
          />

          {/* Floating Tool Dock */}
          <FloatingTools className="absolute left-4 top-4" />
        </div>

        {/* Right Intelligence Panel */}
        <IntelligencePanel project={project} />
      </div>

      {/* Bottom Operational Cockpit */}
      <OperationalCockpit
        cogDefault={project.cogDefault}
        baseTonnage={project.baseTonnage}
        baseNetValue={project.baseNetValue}
      />
    </div>
  );
}
