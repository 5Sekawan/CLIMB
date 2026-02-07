"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { CSlider } from "@/components/climb/ui";
import { CBadge } from "@/components/climb/ui";
import {
  MapPinIcon,
  LayersIcon,
  VoxelIcon,
  SatelliteIcon,
  EyeIcon,
  ChevronDownIcon,
} from "@/components/climb/icons";
import { useState } from "react";
import type { ProjectDetail } from "@/lib/mock-data";

interface ControlSidebarProps {
  project: ProjectDetail;
  selectedMineral: string;
  onMineralChange: (mineral: string) => void;
  depthValue: number;
  onDepthChange: (val: number) => void;
  opacityValue: number;
  onOpacityChange: (val: number) => void;
  activeLayerId: string;
  onLayerChange: (id: string) => void;
  className?: string;
}

const layers = [
  { id: "satellite", label: "Satellite Imagery", icon: SatelliteIcon },
  { id: "voxel", label: "Voxel Model", icon: VoxelIcon },
  // { id: "dem", label: "DEM Surface", icon: LayersIcon },
];

export function ControlSidebar({
  project,
  selectedMineral,
  onMineralChange,
  depthValue,
  onDepthChange,
  opacityValue,
  onOpacityChange,
  activeLayerId,
  onLayerChange,
  className,
}: ControlSidebarProps) {
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    meta: true,
    layers: true,
    minerals: true,
    depth: true,
    opacity: true,
  });

  const toggleSection = (key: string) =>
    setSectionsOpen((p) => ({ ...p, [key]: !p[key] }));

  return (
    <aside
      className={cn(
        "flex w-[280px] flex-col overflow-y-auto border-r border-border bg-card/95 backdrop-blur-sm",
        className,
      )}
    >
      {/* Project Meta -- dynamic from project */}
      <SidebarSection
        title="Project Info"
        isOpen={sectionsOpen.meta}
        onToggle={() => toggleSection("meta")}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-climb-mint" />
            <span className="text-sm font-semibold text-foreground">
              {project.name}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <InfoRow label="Location" value={project.location} />
            <InfoRow label="Center" value={project.center} />
            <InfoRow label="Area" value={project.area} />
            <InfoRow label="Elevation" value={project.elevation} />
          </div>
          <div className="flex items-center gap-2">
            <CBadge
              variant={
                project.driftStatus === "stable" ? "stable" : "drifting"
              }
            >
              {project.driftStatus === "stable" ? "Synced" : "Drifting"}
            </CBadge>
            <span className="text-[10px] text-muted-foreground">
              Last: {project.lastSyncedAt}
            </span>
          </div>
        </div>
      </SidebarSection>

      {/* Layer Management */}
      <SidebarSection
        title="Layers"
        isOpen={sectionsOpen.layers}
        onToggle={() => toggleSection("layers")}
      >
        <div className="flex flex-col gap-2">
          {layers.map((layer) => {
            const Icon = layer.icon;
            const isActive = activeLayerId === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => onLayerChange(layer.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-climb-fast",
                  isActive
                    ? "bg-climb-mint-subtle text-foreground shadow-climb-1"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left text-xs font-medium">
                  {layer.label}
                </span>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-climb-mint animate-pulse" : "bg-border"
                )} />
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* Mineral Selection -- dynamic from project.mineralLayers */}
      <SidebarSection
        title="Mineral Layer"
        isOpen={sectionsOpen.minerals}
        onToggle={() => toggleSection("minerals")}
      >
        <div className="flex flex-col gap-1.5">
          {project.mineralLayers.map((m) => (
            <button
              key={m.id}
              onClick={() => onMineralChange(m.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-climb-fast",
                selectedMineral === m.id
                  ? "bg-climb-mint-subtle text-foreground ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("h-3 w-3 rounded-full", m.color)} />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </SidebarSection>

      {/* Depth Slicer */}
      <SidebarSection
        title="Depth Slicer"
        isOpen={sectionsOpen.depth}
        onToggle={() => toggleSection("depth")}
      >
        <CSlider
          min={0}
          max={50}
          step={1}
          value={depthValue}
          onChange={onDepthChange}
          unit="m"
          label="Cut Depth"
        />
      </SidebarSection>

      {/* Opacity Controller */}
      <SidebarSection
        title="Opacity"
        isOpen={sectionsOpen.opacity}
        onToggle={() => toggleSection("opacity")}
      >
        <CSlider
          min={0}
          max={1}
          step={0.01}
          value={opacityValue}
          onChange={onOpacityChange}
          label="Voxel Opacity"
        />
      </SidebarSection>
    </aside>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function SidebarSection({
  title,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-climb-fast",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}
