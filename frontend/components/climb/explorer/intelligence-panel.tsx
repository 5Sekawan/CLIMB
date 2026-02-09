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
    project.status === 'processing' || startInference.isPending || project.status === 'active'
  );

  const currentStatus = statusData?.status || project.status;
  const isProcessing = currentStatus === 'processing';
  const phase = statusData?.inferencePhase;

  // Determine if stages are done based on phase history or current completion
  const isStepComplete = (step: string) => {
    if (project.status === 'active' && !isProcessing) return true; // Legacy or finished projects
    return phase?.completedSteps?.includes(step) || false;
  };

  const currentPhaseIndex = (() => {
    if (!phase?.current) return project.status === 'active' ? 5 : 0;
    const map: Record<string, number> = {
      'recon': 0,
      'context': 1,
      'voxelization': 2,
      'processing': 3,
      'merging': 4,
      'summary': 4,
      'complete': 5
    };
    return map[phase.current] ?? 0;
  })();

  const handleStartInference = () => {
    startInference.mutate(project.id);
  };

  const hasInferenceResults = project.status === 'active' && !!project.lastInferenceAt;

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
          disabled={isProcessing || hasInferenceResults}
        >
          {isProcessing ? (
            <>
              <RotateIcon className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : hasInferenceResults ? (
            <>
              <BrainIcon className="h-3.5 w-3.5" />
              Inference Complete
            </>
          ) : (
            <>
              <BrainIcon className="h-3.5 w-3.5" />
              Run AI Inference
            </>
          )}
        </CButton>
        <p className="mt-2 text-[10px] text-center text-muted-foreground leading-tight">
          {hasInferenceResults
            ? "Inference completed. Review results below."
            : "Trigger hybrid synthesis of GEE, RAG, and BigQuery data to generate 3D block model."}
        </p>
      </div>

      {/* Dynamic Cards: Render based on completed phases */}

      {/* PHASE 0: Mineral Reconnaissance */}
      {(isStepComplete('recon') || project.cachedContext?.mineralRecon) && (
        <div className="border-b border-border p-4 animate-fade-in-up">
          <InsightCard
            icon={<LayersIcon className="h-4 w-4" />}
            title="Mineral Reconnaissance"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {project.cachedContext?.mineralRecon?.predictedMinerals.map((mineral: string) => (
                  <span
                    key={mineral}
                    className="rounded-md bg-climb-mint/20 px-2 py-0.5 font-mono text-[10px] font-bold text-climb-mint"
                  >
                    {mineral}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {project.cachedContext?.mineralRecon?.reasoning}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Recon Confidence:</span>
                <span className="font-mono font-semibold text-foreground">
                  {((project.cachedContext?.mineralRecon?.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </InsightCard>
        </div>
      )}

      {/* PHASE 1: Context Gathering (Nearest Deposits) */}
      {(isStepComplete('context') || (project.nearestDeposits?.length || 0) > 0) && (
        <div className="p-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Nearest Known Deposits
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {project.nearestDeposits.slice(0, 5).map((dep, i) => (
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 5/6: AI Summary & Final Confidence (After complete) */}
      {(isStepComplete('summary') || project.aiSummary) && (
        <>
          <div className="border-t border-b border-border p-4 animate-fade-in-up">
            <InsightCard
              icon={<BrainIcon className="h-4 w-4" />}
              title="AI Executive Summary"
            >
              {/* Use cachedContext.aiSummary if available (new schema), else fallback to generic logic */}
              <p className="text-xs leading-relaxed">
                {project.cachedContext?.aiSummary?.text || project.aiSummary || "Analysis complete."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-foreground">
                  Grade: {project.cachedContext?.aiSummary?.gradeRange || project.baseGradeRange}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Depth: {project.cachedContext?.aiSummary?.depthRange || project.depthRange}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground text-[9px]">
                  Generated: {project.cachedContext?.aiSummary?.generatedAt ? new Date(project.cachedContext.aiSummary.generatedAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </InsightCard>
          </div>

          {/* Final Confidence Gauge */}
          <div className="flex items-center justify-center border-b border-border py-5 animate-fade-in-up delay-100">
            <ConfidenceGauge
              value={project.cachedContext?.aiSummary?.confidence || project.confidence}
              label="Final Model Confidence"
            />
          </div>
        </>
      )}

      {/* Inference Status - Sticky Bottom */}
      <div className="mt-auto border-t border-border p-4 bg-card/90 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Inference Pipeline
          </h3>
          {isProcessing && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-climb-mint opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-climb-mint"></span>
            </span>
          )}
        </div>

        <InferenceLoading
          stages={[
            { label: "Mineral Reconnaissance", done: currentPhaseIndex >= 1 },
            { label: "Context Gathering (RAG)", done: currentPhaseIndex >= 2 },
            { label: "Voxel Grid Generation", done: currentPhaseIndex >= 3 },
            { label: "Parallel Batch Processing", done: currentPhaseIndex >= 4 },
            { label: "Result Soft-Merge", done: currentPhaseIndex >= 5 },
            { label: "Final AI Summary", done: currentPhaseIndex >= 5 },
          ]}
        />

        {isProcessing && (
          <div className="mt-2 text-[10px] text-muted-foreground font-mono text-center">
            Phase: {phase?.current || 'Initializing...'} ({phase?.progress || 0}%)
          </div>
        )}
      </div>
    </aside>
  );
}
