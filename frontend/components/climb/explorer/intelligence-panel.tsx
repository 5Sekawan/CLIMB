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
  GlobeIcon,
  MapPinIcon,
  LayersIcon,
  FileTextIcon,
} from "@/components/climb/icons";
import { useState, useEffect, useMemo, useRef } from "react";
import type { ProjectDetail } from "@/lib/mock-data";
import { useStartInference, useInferenceStatus } from "@/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";

// ─── Pipeline Phase Mapping ──────────────────────────────────
const PIPELINE_PHASES = [
  { key: "mineral_recon", label: "Mineral Reconnaissance" },
  { key: "gathering_context", label: "Gathering Geological Context" },
  { key: "voxelization", label: "Spatial Voxelization" },
  { key: "batch_processing", label: "Parallel Batch Processing" },
  { key: "merging_results", label: "Merging Results" },
  { key: "generating_summary", label: "Generating AI Summary" },
] as const;

type PipelinePhase = typeof PIPELINE_PHASES[number]["key"] | "idle" | "completed";

function getPhaseIndex(phase: PipelinePhase): number {
  return PIPELINE_PHASES.findIndex((p) => p.key === phase);
}

function getStageStatus(
  stageIndex: number,
  currentPhase: PipelinePhase
): "done" | "active" | "pending" {
  if (currentPhase === "completed") return "done";
  if (currentPhase === "idle") return "pending";
  const currentIndex = getPhaseIndex(currentPhase);
  if (stageIndex < currentIndex) return "done";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

// ─── Component ───────────────────────────────────────────────
interface IntelligencePanelProps {
  project: ProjectDetail;
  className?: string;
}

export function IntelligencePanel({ project, className }: IntelligencePanelProps) {
  const queryClient = useQueryClient();
  const startInference = useStartInference();
  const [isPolling, setIsPolling] = useState(project.status === "processing");
  const prevStatusRef = useRef<string | undefined>(undefined);

  const inferenceStatus = useInferenceStatus(project.id, isPolling);

  // Derived state
  const hasInferenceData = !!project.cachedContext?.mineralRecon;

  // Auto-detect completed state for legacy projects (have data but no pipelinePhase set)
  const resolvedPhase: PipelinePhase = (() => {
    const polledPhase = inferenceStatus.data?.pipelinePhase as PipelinePhase | undefined;
    if (polledPhase && polledPhase !== "idle") return polledPhase;
    const projectPhase = project.pipelinePhase as PipelinePhase | undefined;
    if (projectPhase && projectPhase !== "idle") return projectPhase;
    // Legacy: if project has inference data but no phase set, treat as completed
    if (hasInferenceData) return "completed";
    return "idle";
  })();

  const isProcessing = project.status === "processing" || inferenceStatus.data?.status === "processing";

  // Track completion to invalidate project data
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const newStatus = inferenceStatus.data?.status;
    prevStatusRef.current = newStatus;

    if (prevStatus === "processing" && newStatus === "active") {
      setIsPolling(false);
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["project-voxels", project.id] });
    }
  }, [inferenceStatus.data?.status, queryClient, project.id]);

  // Start polling when inference starts
  useEffect(() => {
    if (project.status === "processing") {
      setIsPolling(true);
    }
  }, [project.status]);

  // Button handler
  const handleRunInference = () => {
    startInference.mutate(project.id, {
      onSuccess: () => setIsPolling(true),
    });
  };

  // ─── Button State ──────────────────────────────────
  // Only disabled DURING processing — allows re-run after completion
  const isButtonDisabled = isProcessing || startInference.isPending;

  const buttonLabel = isProcessing
    ? "Processing..."
    : hasInferenceData
      ? "Re-run Inference"
      : "Run AI Inference";

  // ─── Dynamic Card Visibility ───────────────────────
  const showRecon = hasInferenceData || getStageStatus(0, resolvedPhase) === "done";
  const showDeposits = showRecon && (resolvedPhase === "completed" ||
    getPhaseIndex(resolvedPhase) >= 1 ||
    !!project.cachedContext?.nearestDeposits);
  const showSummary = resolvedPhase === "completed" && !!project.cachedContext?.aiSummary;

  // ─── Pipeline Stages ──────────────────────────────
  const pipelineStages = useMemo(
    () =>
      PIPELINE_PHASES.map((phase, i) => ({
        label: phase.label,
        status: getStageStatus(i, resolvedPhase),
      })),
    [resolvedPhase]
  );

  // ─── Confidence Value ──────────────────────────────
  const confidenceValue = project.cachedContext?.aiSummary?.confidence
    ?? project.confidence
    ?? 0;

  return (
    <div className={cn("flex w-[320px] shrink-0 flex-col h-full overflow-hidden border-l border-border bg-card/95 backdrop-blur-sm", className)}>
      {/* ─── Scrollable Content ──────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-48">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon className="h-4 w-4 text-climb-mint" />
            <h2 className="text-sm font-semibold text-foreground">Intelligence Panel</h2>
          </div>
          {isProcessing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-climb-mint-subtle px-2.5 py-0.5 text-[10px] font-semibold text-climb-mint animate-ai-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-climb-mint" />
              LIVE
            </span>
          )}
        </div>

        {/* Run AI Button */}
        <CButton
          variant="solid"
          size="sm"
          className="w-full"
          onClick={handleRunInference}
          disabled={isButtonDisabled}
        >
          {isProcessing ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
              {buttonLabel}
            </>
          ) : hasInferenceData ? (
            <>
              <span className="text-xs">✓</span>
              {buttonLabel}
            </>
          ) : (
            <>
              <BrainIcon className="h-3.5 w-3.5" />
              {buttonLabel}
            </>
          )}
        </CButton>

        {/* ─── Empty State ──────────────────────────── */}
        {!isProcessing && !hasInferenceData && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <BrainIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No Intelligence Data</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                Run AI Inference to analyze geological data, predict mineralization, and generate insights.
              </p>
            </div>
          </div>
        )}

        {/* ─── Processing Skeleton ──────────────────── */}
        {isProcessing && !hasInferenceData && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl border border-border/50 bg-card/50 p-5 animate-pulse",
                  i > getPhaseIndex(resolvedPhase) && "opacity-30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-muted animate-shimmer" />
                    <div className="h-2.5 w-full rounded bg-muted animate-shimmer" />
                    <div className="h-2.5 w-3/4 rounded bg-muted animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Mineral Reconnaissance Card ──────────── */}
        {showRecon && project.cachedContext?.mineralRecon && (
          <div className="animate-fade-in-up">
            <InsightCard
              icon={<GlobeIcon className="h-4 w-4" />}
              title="Mineral Reconnaissance"
            >
              <div className="space-y-3">
                <p className="text-xs leading-relaxed">
                  {project.cachedContext.mineralRecon.reasoning}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.cachedContext.mineralRecon.predictedMinerals.map(
                    (mineral) => (
                      <span
                        key={mineral}
                        className="rounded-full bg-climb-mint-subtle px-2 py-0.5 text-[10px] font-semibold text-climb-mint"
                      >
                        {mineral}
                      </span>
                    )
                  )}
                </div>
                {project.cachedContext.mineralRecon.surfaceAnalysis && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Surface Analysis</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">NDVI</p>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {project.cachedContext.mineralRecon.surfaceAnalysis.ndvi.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Thermal</p>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {project.cachedContext.mineralRecon.surfaceAnalysis.thermal.toFixed(1)}°C
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">SWIR</p>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {project.cachedContext.mineralRecon.surfaceAnalysis.swir.toFixed(3)}
                        </p>
                      </div>
                    </div>
                    {project.cachedContext.mineralRecon.surfaceAnalysis.interpretation && (
                      <p className="mt-2 text-[10px] text-muted-foreground italic leading-relaxed">
                        {project.cachedContext.mineralRecon.surfaceAnalysis.interpretation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </InsightCard>
          </div>
        )}

        {/* ─── Nearest Known Deposits Card ─────────── */}
        {showDeposits && project.cachedContext?.nearestDeposits && project.cachedContext.nearestDeposits.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <InsightCard
              icon={<MapPinIcon className="h-4 w-4" />}
              title="Nearest Known Deposits"
            >
              <div className="space-y-2">
                {project.cachedContext.nearestDeposits.slice(0, 5).map((dep, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-lg bg-muted/40 p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {dep.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {dep.source}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-mono font-semibold text-foreground">
                        {dep.distance}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {dep.grade}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </InsightCard>
          </div>
        )}

        {/* ─── AI Summary Card ────────────────────────── */}
        {showSummary && project.cachedContext?.aiSummary && (
          <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <InsightCard
              icon={<FileTextIcon className="h-4 w-4" />}
              title="AI Summary"
            >
              <div className="space-y-3">
                <p className="text-xs leading-relaxed">
                  {project.cachedContext.aiSummary.text}
                </p>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Final Model Confidence
                  </span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    project.cachedContext.aiSummary.confidence >= 75 ? "text-climb-mint" :
                      project.cachedContext.aiSummary.confidence >= 50 ? "text-climb-marginal" :
                        "text-climb-drifting"
                  )}>
                    {project.cachedContext.aiSummary.confidence}%
                  </span>
                </div>
              </div>
            </InsightCard>
          </div>
        )}

        {/* ─── Confidence Gauge ───────────────────────── */}
        {hasInferenceData && (
          <div className="flex justify-center py-2 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <ConfidenceGauge
              value={confidenceValue}
              label="Model Confidence"
            />
          </div>
        )}
      </div>

      {/* ─── Frozen Pipeline at Bottom ────────────────── */}
      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayersIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Inference Pipeline
            </span>
          </div>
          <span className={cn(
            "text-[10px] font-semibold rounded-full px-2 py-0.5",
            resolvedPhase === "idle" && "text-muted-foreground bg-muted",
            resolvedPhase === "completed" && "text-climb-mint bg-climb-mint-subtle",
            resolvedPhase !== "idle" && resolvedPhase !== "completed" && "text-climb-mint bg-climb-mint-subtle animate-ai-pulse"
          )}>
            {resolvedPhase === "idle" ? "WAITING" :
              resolvedPhase === "completed" ? "COMPLETE" : "RUNNING"}
          </span>
        </div>
        <InferenceLoading stages={pipelineStages} />
      </div>
    </div>
  );
}
