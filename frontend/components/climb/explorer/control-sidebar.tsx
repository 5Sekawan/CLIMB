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
  LockIcon,
} from "@/components/climb/icons";
import { useState } from "react";
import type { ProjectDetail } from "@/lib/mock-data";

interface ControlSidebarProps {
  project: ProjectDetail;
  selectedMinerals: string[];
  onMineralsChange: (minerals: string[]) => void;
  depthValue: number;
  onDepthChange: (val: number) => void;
  opacityValue: number;
  onOpacityChange: (val: number) => void;
  activeLayerId: string;
  onLayerChange: (id: string) => void;
  hasVoxels: boolean;
  className?: string;
}

const layers = [
  { id: "satellite", label: "Satellite Imagery", icon: SatelliteIcon },
  { id: "voxel", label: "Voxel Model", icon: VoxelIcon },
];

export function ControlSidebar({
  project,
  selectedMinerals,
  onMineralsChange,
  depthValue,
  onDepthChange,
  opacityValue,
  onOpacityChange,
  activeLayerId,
  onLayerChange,
  hasVoxels,
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

  const toggleMineral = (mineralId: string) => {
    if (selectedMinerals.includes(mineralId)) {
      // Remove if already selected (but keep at least one)
      if (selectedMinerals.length > 1) {
        onMineralsChange(selectedMinerals.filter((m) => m !== mineralId));
      }
    } else {
      // Add to selection
      onMineralsChange([...selectedMinerals, mineralId]);
    }
  };

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
            const isDisabled = layer.id === "voxel" && !hasVoxels;

            return (
              <button
                key={layer.id}
                onClick={() => !isDisabled && onLayerChange(layer.id)}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-climb-fast",
                  isDisabled
                    ? "cursor-not-allowed opacity-50"
                    : isActive
                      ? "bg-climb-mint-subtle text-foreground shadow-climb-1"
                      : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left text-xs font-medium">
                  {layer.label}
                </span>
                {isDisabled ? (
                  <LockIcon className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-climb-mint animate-pulse" : "bg-border"
                  )} />
                )}
              </button>
            );
          })}
          {!hasVoxels && (
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Run AI Inference to unlock Voxel Model
            </p>
          )}
        </div>
      </SidebarSection>

      {/* Mineral Selection -- multi-select checkboxes */}
      <SidebarSection
        title="Mineral Layers"
        isOpen={sectionsOpen.minerals}
        onToggle={() => toggleSection("minerals")}
        disabled={!hasVoxels}
      >
        {hasVoxels ? (
          <div className="flex flex-col gap-1.5">
            {project.mineralLayers.map((m) => {
              const isChecked = selectedMinerals.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMineral(m.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-climb-fast",
                    isChecked
                      ? "bg-climb-mint-subtle text-foreground ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {/* Checkbox indicator */}
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border-2 transition-all",
                    isChecked
                      ? "border-climb-mint bg-climb-mint"
                      : "border-muted-foreground"
                  )}>
                    {isChecked && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <LockIcon className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground">
              Run AI Inference to filter by minerals
            </p>
          </div>
        )}
      </SidebarSection>

      {/* Depth Slicer */}
      <SidebarSection
        title="Depth Slicer"
        isOpen={sectionsOpen.depth}
        onToggle={() => toggleSection("depth")}
        disabled={!hasVoxels}
      >
        {hasVoxels ? (
          <CSlider
            min={0}
            max={50}
            step={1}
            value={depthValue}
            onChange={onDepthChange}
            unit="m"
            label="Cut Depth"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <LockIcon className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground">
              Available after inference
            </p>
          </div>
        )}
      </SidebarSection>

      {/* Opacity Controller */}
      <SidebarSection
        title="Opacity"
        isOpen={sectionsOpen.opacity}
        onToggle={() => toggleSection("opacity")}
        disabled={!hasVoxels}
      >
        {hasVoxels ? (
          <CSlider
            min={0}
            max={1}
            step={0.01}
            value={opacityValue}
            onChange={onOpacityChange}
            label="Voxel Opacity"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <LockIcon className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground">
              Available after inference
            </p>
          </div>
        )}
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
  disabled,
}: {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors",
          disabled
            ? "text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          {title}
          {disabled && <LockIcon className="h-3 w-3" />}
        </span>
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
