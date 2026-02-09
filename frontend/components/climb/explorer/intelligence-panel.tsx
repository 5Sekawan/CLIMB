"use client";

import { cn } from "@/lib/utils";
import {
  InsightCard,
  ConfidenceGauge,
  InferenceLoading,
  CButton,
} from "@/components/climb/ui";
import {
  BrainIcon,
  FileTextIcon,
  GlobeIcon,
  ChevronDownIcon,
  MapPinIcon,
  RotateIcon,
  LayersIcon,
} from "@/components/climb/icons";
import { useState } from "react";
import type { ProjectDetail } from "@/lib/mock-data";
import { useStartInference, useInferenceStatus } from "@/hooks/use-projects";

interface IntelligencePanelProps {
  project: ProjectDetail;
  className?: string;
}

export function IntelligencePanel({
  project,
  className,
}: IntelligencePanelProps) {
  const [ragExpanded, setRagExpanded] = useState(false);
  const startInference = useStartInference();

  // Polling status if the project is currently processing or after a manual start
  const { data: statusData } = useInferenceStatus(
    project.id,
    project.status === 'processing' || startInference.isPending
  );

  const currentStatus = statusData?.status || project.status;
  const isProcessing = currentStatus === 'processing';

  const handleStartInference = () => {
    startInference.mutate(project.id);
  };

  return (
    <aside
      className={cn(
        "flex w-[320px] flex-col overflow-y-auto border-l border-border bg-card/95 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BrainIcon className="h-4 w-4 text-climb-mint" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          AI Intelligence
        </h2>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {project.name}
        </span>
      </div>

      {/* Action Area */}
      <div className="border-b border-border p-4 bg-muted/20">
        <CButton
          variant="solid"
          size="sm"
          className="w-full"
          onClick={handleStartInference}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <RotateIcon className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <BrainIcon className="h-3.5 w-3.5" />
              Run AI Inference
            </>
          )}
        </CButton>
        <p className="mt-2 text-[10px] text-center text-muted-foreground leading-tight">
          Trigger hybrid synthesis of GEE, RAG, and BigQuery data to generate 3D block model.
        </p>
      </div>

      {/* Mineral Reconnaissance (NEW) */}
      {project.cachedContext?.mineralRecon && (
        <div className="border-b border-border p-4">
          <InsightCard
            icon={<LayersIcon className="h-4 w-4" />}
            title="Mineral Reconnaissance"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {project.cachedContext.mineralRecon.predictedMinerals.map((mineral: string) => (
                  <span
                    key={mineral}
                    className="rounded-md bg-climb-mint/20 px-2 py-0.5 font-mono text-[10px] font-bold text-climb-mint"
                  >
                    {mineral}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {project.cachedContext.mineralRecon.reasoning}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Confidence:</span>
                <span className="font-mono font-semibold text-foreground">
                  {(project.cachedContext.mineralRecon.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </InsightCard>
        </div>
      )}

      {/* AI Reasoning Card (RAG) -- dynamic from project.ragContext */}
      <div className="border-b border-border p-4">
        <InsightCard
          icon={<FileTextIcon className="h-4 w-4" />}
          title="Geological Reasoning (RAG)"
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs leading-relaxed">
              {project.ragContext.shortText}
            </p>
            <button
              onClick={() => setRagExpanded(!ragExpanded)}
              className="flex items-center gap-1 text-[11px] font-medium text-climb-mint hover:underline"
            >
              {ragExpanded ? "Show less" : "Read more"}
              <ChevronDownIcon
                className={cn(
                  "h-3 w-3 transition-transform duration-climb-fast",
                  ragExpanded ? "rotate-180" : "",
                )}
              />
            </button>
            {ragExpanded && (
              <div className="animate-fade-in-up">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {project.ragContext.longText}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Source:
                  </span>
                  <button className="text-[10px] font-medium text-climb-mint hover:underline">
                    {project.ragContext.sourceRef}
                  </button>
                </div>
              </div>
            )}
          </div>
        </InsightCard>
      </div>

      {/* AI Summary -- dynamic */}
      <div className="border-b border-border p-4">
        <InsightCard
          icon={<BrainIcon className="h-4 w-4" />}
          title="AI Summary"
        >
          <p className="text-xs leading-relaxed">{project.aiSummary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-foreground">
              {project.baseGradeRange}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              Depth: {project.depthRange}
            </span>
          </div>
        </InsightCard>
      </div>

      {/* Confidence Score -- dynamic */}
      <div className="flex items-center justify-center border-b border-border py-5">
        <ConfidenceGauge value={project.confidence} label="Model Confidence" />
      </div>

      {/* Top 5 Nearest Deposits -- dynamic from project.nearestDeposits */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GlobeIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Nearest Known Deposits
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          {project.nearestDeposits.map((dep, i) => (
            <div
              key={dep.name}
              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors duration-climb-fast hover:bg-muted/50"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {dep.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MapPinIcon className="h-2.5 w-2.5" />
                    {dep.distance}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-foreground">
                    {dep.grade}
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">
                {dep.source}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Inference Status */}
      <div className="mt-auto border-t border-border p-4">
        <h3 className="mb-3 text-xs font-semibold text-foreground uppercase tracking-wider">
          Inference Pipeline
        </h3>
        <InferenceLoading
          stages={[
            { label: "Mineral Reconnaissance...", done: true },
            { label: "Analyzing Satellite Imagery...", done: true },
            { label: "Querying Geological Knowledge...", done: true },
            { label: "Enriching with Kaggle Data...", done: true },
            { label: "Synthesizing Voxel Grid...", done: true },
          ]}
        />
      </div>
    </aside>
  );
}
