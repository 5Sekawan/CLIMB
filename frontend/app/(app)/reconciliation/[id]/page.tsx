"use client";

import { use, useCallback } from "react";
import { StatCard, CButton, CBadge, InsightCard } from "@/components/climb/ui";
import {
  UploadIcon,
  ChartUpIcon,
  BrainIcon,
  RecycleIcon,
  ActivityIcon,
  FileTextIcon,
  MountainIcon,
  ArrowLeftIcon,
  VoxelIcon,
} from "@/components/climb/icons";
import { ComparisonWorkspace } from "@/components/climb/reconciliation/comparison-workspace";
import { LessonsTerminal } from "@/components/climb/reconciliation/lessons-terminal";
import { getProjectDetail } from "@/lib/mock-data";
import { useState } from "react";
import { cn, parseCoordinates } from "@/lib/utils";
import Link from "next/link";
import { useUploadActuals } from "@/hooks/use-reconciliation";
import { Toast } from "@/components/climb/toast";

const blockData = [
  { block: "A3-12", predicted: 2.84, actual: 2.65, variance: -0.19, status: "ok" as const },
  { block: "A3-13", predicted: 1.92, actual: 2.14, variance: 0.22, status: "ok" as const },
  { block: "B7-01", predicted: 3.45, actual: 2.81, variance: -0.64, status: "drift" as const },
  { block: "B7-02", predicted: 2.67, actual: 2.51, variance: -0.16, status: "ok" as const },
  { block: "B7-03", predicted: 4.12, actual: 3.24, variance: -0.88, status: "drift" as const },
  { block: "C2-08", predicted: 1.56, actual: 1.72, variance: 0.16, status: "ok" as const },
  { block: "C2-09", predicted: 2.01, actual: 2.33, variance: 0.32, status: "warning" as const },
  { block: "D1-04", predicted: 3.78, actual: 3.11, variance: -0.67, status: "drift" as const },
];

export default function ReconciliationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = getProjectDetail(id);
  const [isDragging, setIsDragging] = useState(false);
  const uploadActuals = useUploadActuals();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      try {
        const res = await uploadActuals.mutateAsync({ file, projectId: id });
        setToast({ 
          visible: true, 
          message: `Processed ${res.count} records. Status: ${res.summary.status}`, 
          type: 'success' 
        });
      } catch (err: any) {
        setToast({ 
          visible: true, 
          message: err.message || 'Upload failed', 
          type: 'error' 
        });
      }
    }
  }, [id, uploadActuals]);

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <MountainIcon className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Project Not Found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {"The project \""}{id}{"\" does not exist or has been removed."}
            </p>
          </div>
          <Link href="/reconciliation">
            <CButton variant="solid" size="md">Back to Reconciliation</CButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar: Same style as Explorer Detail */}
      <div className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
        <Link
          href="/reconciliation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-climb-fast hover:bg-muted hover:text-foreground"
          aria-label="Back to Reconciliation"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <RecycleIcon className="h-4 w-4 shrink-0 text-climb-mint" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            {project.name}
          </h1>
          <span className="shrink-0 text-xs text-muted-foreground">
            {project.location}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={`/explorer/${project.id}`}>
            <CButton variant="outline" size="sm">
              <VoxelIcon className="h-3.5 w-3.5" />
              Detail Explorer
            </CButton>
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          {/* Page Header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <RecycleIcon className="h-5 w-5 text-climb-mint" />
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Reconciliation Lab
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.name} - Analyze model deviation and inject corrective feedback.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <CBadge variant="drifting">3 Blocks Drifting</CBadge>
              <CBadge variant="stable">5 Blocks Stable</CBadge>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Avg. Variance" value="-0.23" unit="g/t" icon={<ChartUpIcon className="h-4 w-4" />} trend="down" />
            <StatCard label="Blocks Analyzed" value={142} icon={<ActivityIcon className="h-4 w-4" />} trend="up" />
            <StatCard label="Model Bias" value="Over-est." icon={<BrainIcon className="h-4 w-4" />} trend="down" />
            <StatCard label="Lessons Injected" value={7} icon={<FileTextIcon className="h-4 w-4" />} trend="up" />
          </div>

          {/* Main Grid */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left: 3D Comparison + Upload */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">3D Comparison Workspace</h2>
                <ComparisonWorkspace />
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-climb-fast cursor-pointer",
                  isDragging
                    ? "border-primary bg-climb-mint-subtle"
                    : "border-border bg-card hover:border-primary/30",
                  uploadActuals.isPending && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UploadIcon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {uploadActuals.isPending ? "Analyzing..." : "Upload Actual Grade Data"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Drag & drop CSV file from lab results, or click to browse</p>
                </div>
                <CButton variant="outline" size="sm" disabled={uploadActuals.isPending}>Browse Files</CButton>
              </div>
            </div>

            {/* Right: Block Table + Lessons */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Block Comparison Table */}
              <div className="rounded-xl border border-border bg-card shadow-climb-1">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Block Comparison</h3>
                  <span className="text-[10px] text-muted-foreground">{blockData.length} blocks</span>
                </div>
                <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-border">
                  {["Block", "Predicted", "Actual", "Var.", "Status"].map((header) => (
                    <span key={header} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{header}</span>
                  ))}
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {blockData.map((row) => (
                    <div key={row.block} className="grid grid-cols-5 gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors duration-climb-fast">
                      <span className="font-mono text-xs font-medium text-foreground">{row.block}</span>
                      <span className="font-mono text-xs text-muted-foreground">{row.predicted.toFixed(2)}</span>
                      <span className="font-mono text-xs text-foreground">{row.actual.toFixed(2)}</span>
                      <span className={cn(
                        "font-mono text-xs font-semibold",
                        row.variance > 0 ? "text-blue-500" : row.variance < -0.3 ? "text-climb-drifting" : "text-muted-foreground"
                      )}>
                        {row.variance > 0 ? "+" : ""}{row.variance.toFixed(2)}
                      </span>
                      <CBadge variant={row.status === "drift" ? "drifting" : row.status === "warning" ? "marginal" : "stable"}>
                        {row.status === "drift" ? "Drift" : row.status === "warning" ? "Watch" : "OK"}
                      </CBadge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drift Insight */}
              <InsightCard icon={<BrainIcon className="h-4 w-4" />} title="Drift Analysis Summary">
                <p className="text-xs leading-relaxed">
                  Model shows systematic <strong className="text-foreground">over-estimation bias of +5.2%</strong> in
                  B7 sector blocks where thermal anomaly exceeds 2.0K above ambient. Recommend applying SWIR correction factor before next inference cycle.
                </p>
              </InsightCard>
            </div>
          </div>

          {/* Lessons Learned Terminal */}
          <div className="mt-8">
            <LessonsTerminal />
          </div>
        </div>
      </div>
      
      {/* Toast */}
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
