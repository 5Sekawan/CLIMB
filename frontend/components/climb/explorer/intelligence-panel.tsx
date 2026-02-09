"use client";

import { cn } from "@/lib/utils";
import {
  InsightCard,
  ConfidenceGauge,
  PipelineStepper,
  CButton,
} from "@/components/climb/ui";
import {
  BrainIcon,
  GlobeIcon,
  MapPinIcon,
  RotateIcon,
  LayersIcon,
} from "@/components/climb/icons";
import type { ProjectDetail } from "@/lib/mock-data";

interface InferenceStatusData {
  status: string;
  lastInferenceAt?: string;
  inferencePhase?: {
    current: string;
    progress: number;
    completedSteps: string[];
  };
}

interface IntelligencePanelProps {
  project: ProjectDetail;
  inferenceStatus?: InferenceStatusData;
  isProcessing: boolean;
  onStartInference: () => void;
  className?: string;
}

// Pipeline steps definition
const PIPELINE_STEPS = [
  { id: 'recon', label: 'Mineral Reconnaissance', shortLabel: 'Recon' },
  { id: 'context', label: 'Context Gathering', shortLabel: 'Context' },
  { id: 'voxelization', label: 'Voxel Generation', shortLabel: 'Voxels' },
  { id: 'processing', label: 'Batch Processing', shortLabel: 'Processing' },
  { id: 'merging', label: 'Result Merging', shortLabel: 'Merging' },
  { id: 'summary', label: 'AI Summary', shortLabel: 'Summary' },
];

export function IntelligencePanel({
  project,
  inferenceStatus,
  isProcessing,
  onStartInference,
  className,
}: IntelligencePanelProps) {
  // Use inference status from props (lifted to parent for real-time sync)
  const phase = inferenceStatus?.inferencePhase;

  // Determine current step and completed steps
  const currentStep = phase?.current || (project.lastInferenceAt ? 'complete' : 'idle');
  const completedSteps = phase?.completedSteps || (project.lastInferenceAt ? PIPELINE_STEPS.map(s => s.id) : []);
  const progress = phase?.progress || (project.lastInferenceAt ? 100 : 0);

  // Determine if stages are done based on phase history or current completion
  const isStepComplete = (step: string) => {
    if (project.lastInferenceAt && !isProcessing) return true;
    return completedSteps.includes(step);
  };

  const hasInferenceResults = !!project.lastInferenceAt && !isProcessing;


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

      {/* Pipeline Status (At Top) */}
      <div className="border-b border-border p-4 bg-muted/10">
        <PipelineStepper
          steps={PIPELINE_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          progress={progress}
          isProcessing={isProcessing}
        />
      </div>

      {/* Dynamic Cards: Render based on completed phases */}
      <div className="flex-1 overflow-y-auto">
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
          <div className="border-b border-border p-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
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
            <div className="border-b border-border p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <InsightCard
                icon={<BrainIcon className="h-4 w-4" />}
                title="AI Executive Summary"
              >
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
                </div>
              </InsightCard>
            </div>

            {/* Final Confidence Gauge */}
            <div className="flex items-center justify-center border-b border-border py-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <ConfidenceGauge
                value={(project.cachedContext?.aiSummary?.confidence || project.confidence) * 100}
                label="Final Model Confidence"
              />
            </div>
          </>
        )}
      </div>

      {/* Action Area (At Bottom) */}
      <div className="border-t border-border p-4 bg-muted/20 mt-auto">
        <CButton
          variant="solid"
          size="sm"
          className="w-full"
          onClick={onStartInference}
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
            ? "View results above. Re-run requires project reset."
            : "Synthesize GEE, RAG, and BigQuery data to generate 3D block model."}
        </p>
      </div>
    </aside>
  );
}
