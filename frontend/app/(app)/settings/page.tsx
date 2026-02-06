"use client";

import { cn } from "@/lib/utils";
import { CButton, CInput, CBadge, InsightCard } from "@/components/climb/ui";
import {
  KeyIcon,
  DollarIcon,
  DatabaseIcon,
  SettingsIcon,
  FileTextIcon,
  GlobeIcon,
  BrainIcon,
  UploadIcon,
  SearchIcon,
  ChevronLeftIcon,
} from "@/components/climb/icons";
import { useState, useCallback, useMemo } from "react";
import { Toast } from "@/components/climb/toast";

// ─── Small Icons ─────────────────────────────────────────────
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("h-3 w-3", className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronRightSmallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4", className)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ─── API Keys ────────────────────────────────────────────────
const apiConnections = [
  { id: "gee", name: "Google Earth Engine", icon: GlobeIcon, status: "connected" as const, lastChecked: "2 min ago" },
  { id: "vertex", name: "Vertex AI (Gemini)", icon: BrainIcon, status: "connected" as const, lastChecked: "5 min ago" },
  { id: "bigquery", name: "BigQuery GIS", icon: DatabaseIcon, status: "connected" as const, lastChecked: "1 min ago" },
  { id: "mongodb", name: "MongoDB (GCP VM)", icon: DatabaseIcon, status: "error" as const, lastChecked: "30 min ago" },
];

// ─── Knowledge Base (more docs for pagination demo) ──────────
interface KBDoc {
  id: number;
  name: string;
  type: "PDF" | "CSV" | "VEC" | "TIFF";
  size: string;
  chunks: number;
  uploadedAt: string;
  selected: boolean;
}

const initialKBDocs: KBDoc[] = [
  { id: 1, name: "NI 43-101 Technical Report - East Kalimantan 2023", type: "PDF", size: "4.2 MB", chunks: 347, uploadedAt: "2024-01-15", selected: true },
  { id: 2, name: "USGS Mineral Resources Data System - Indonesia", type: "CSV", size: "12.8 MB", chunks: 1240, uploadedAt: "2024-01-10", selected: true },
  { id: 3, name: "Geological Survey of Indonesia - Sulawesi Region", type: "PDF", size: "8.1 MB", chunks: 582, uploadedAt: "2024-02-01", selected: true },
  { id: 4, name: "Epithermal Gold Systems - Classification Guide", type: "PDF", size: "2.3 MB", chunks: 198, uploadedAt: "2024-02-05", selected: true },
  { id: 5, name: "SWIR Spectral Analysis Methodology Paper", type: "PDF", size: "1.7 MB", chunks: 142, uploadedAt: "2024-02-10", selected: false },
  { id: 6, name: "Lessons Learned - Thermal Bias Correction (Auto)", type: "VEC", size: "0.4 MB", chunks: 7, uploadedAt: "2024-02-15", selected: true },
  { id: 7, name: "Porphyry Copper Alteration Zonation - Reference", type: "PDF", size: "3.8 MB", chunks: 290, uploadedAt: "2024-03-01", selected: true },
  { id: 8, name: "Indonesia Regional Gravity Survey Data", type: "CSV", size: "18.4 MB", chunks: 1580, uploadedAt: "2024-03-05", selected: false },
  { id: 9, name: "ASTER Satellite Imagery - Band Ratio Analysis", type: "TIFF", size: "45.2 MB", chunks: 890, uploadedAt: "2024-03-10", selected: true },
  { id: 10, name: "Lateritic Nickel Deposits of Halmahera", type: "PDF", size: "5.6 MB", chunks: 420, uploadedAt: "2024-03-15", selected: true },
  { id: 11, name: "IP Chargeability Survey Results - Gorontalo", type: "CSV", size: "8.9 MB", chunks: 670, uploadedAt: "2024-03-20", selected: false },
  { id: 12, name: "Drill Core Photo Log - Berau Campaign 2023", type: "PDF", size: "120.5 MB", chunks: 2100, uploadedAt: "2024-03-25", selected: true },
  { id: 13, name: "Geochemical Assay Database - Multi-element ICP", type: "CSV", size: "22.1 MB", chunks: 1890, uploadedAt: "2024-04-01", selected: true },
  { id: 14, name: "Structural Geology Interpretation - Papua Belt", type: "PDF", size: "6.3 MB", chunks: 510, uploadedAt: "2024-04-05", selected: false },
  { id: 15, name: "Reconciliation Feedback - Model Drift Log Q1 2024", type: "VEC", size: "0.8 MB", chunks: 14, uploadedAt: "2024-04-10", selected: true },
  { id: 16, name: "Remote Sensing Mineral Mapping - Flores Arc", type: "TIFF", size: "38.7 MB", chunks: 750, uploadedAt: "2024-04-15", selected: false },
  { id: 17, name: "Environmental Baseline Study - Kalimantan Sites", type: "PDF", size: "9.2 MB", chunks: 680, uploadedAt: "2024-04-20", selected: true },
  { id: 18, name: "XRF Portable Analyzer Calibration Standards", type: "CSV", size: "1.1 MB", chunks: 85, uploadedAt: "2024-04-25", selected: true },
];

const DOCS_PER_PAGE = 6;

export default function SettingsPage() {
  const [auPrice, setAuPrice] = useState("2045.00");
  const [cuPrice, setCuPrice] = useState("8.42");
  const [miningCost, setMiningCost] = useState("35.00");
  const [processingCost, setProcessingCost] = useState("18.50");
  const [recoveryFactor, setRecoveryFactor] = useState("92.5");

  // Knowledge Base state
  const [kbDocs, setKbDocs] = useState<KBDoc[]>(initialKBDocs);
  const [kbSearch, setKbSearch] = useState("");
  const [kbPage, setKbPage] = useState(1);
  const [kbEditMode, setKbEditMode] = useState(false);
  const [uploadDragOver, setUploadDragOver] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Filtered + paginated docs
  const filteredDocs = useMemo(() => {
    if (!kbSearch.trim()) return kbDocs;
    const q = kbSearch.toLowerCase();
    return kbDocs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
    );
  }, [kbDocs, kbSearch]);

  const totalKbPages = Math.max(1, Math.ceil(filteredDocs.length / DOCS_PER_PAGE));
  const pagedDocs = filteredDocs.slice(
    (kbPage - 1) * DOCS_PER_PAGE,
    kbPage * DOCS_PER_PAGE
  );

  const toggleDoc = useCallback((docId: number) => {
    setKbDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, selected: !d.selected } : d))
    );
  }, []);

  const handleFakeUpload = useCallback(() => {
    const newId = kbDocs.length + 1;
    const newDoc: KBDoc = {
      id: newId,
      name: `uploaded-document-${newId}.pdf`,
      type: "PDF",
      size: "2.1 MB",
      chunks: 0,
      uploadedAt: new Date().toISOString().split("T")[0],
      selected: true,
    };
    setKbDocs((prev) => [...prev, newDoc]);
    setToastMessage("Document uploaded successfully!");
    setToastVisible(true);
  }, [kbDocs.length]);

  const handleSaveKB = useCallback(() => {
    setKbEditMode(false);
    setToastMessage("Knowledge base updated successfully!");
    setToastVisible(true);
  }, []);

  const selectedCount = kbDocs.filter((d) => d.selected).length;
  const totalChunks = kbDocs.filter((d) => d.selected).reduce((s, d) => s + d.chunks, 0);

  // Pagination helper
  function getPaginationNumbers(current: number, total: number) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (current > 3) pages.push("ellipsis");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("ellipsis");
    if (total > 1) pages.push(total);
    return pages;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-climb-mint" />
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Settings & Knowledge Management
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure API connections, economic parameters, and manage the RAG knowledge base.
      </p>

      {/* ── API Key Manager ────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <KeyIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            API Connections
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {apiConnections.map((api) => {
            const Icon = api.icon;
            return (
              <div
                key={api.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-climb-1"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    api.status === "connected"
                      ? "bg-climb-mint-subtle text-climb-mint"
                      : "bg-red-50 text-climb-drifting dark:bg-red-950/30"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">{api.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Last checked: {api.lastChecked}
                  </span>
                </div>
                <CBadge variant={api.status === "connected" ? "stable" : "drifting"}>
                  {api.status === "connected" ? "Connected" : "Error"}
                </CBadge>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Economic Parameters ─────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <DollarIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Economic Parameters
          </h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-climb-1">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CInput id="au-price" label="Gold Price (USD/oz)" type="number" value={auPrice} onChange={(e) => setAuPrice(e.target.value)} placeholder="2045.00" />
            <CInput id="cu-price" label="Copper Price (USD/lb)" type="number" value={cuPrice} onChange={(e) => setCuPrice(e.target.value)} placeholder="8.42" />
            <CInput id="mining-cost" label="Mining Cost (USD/ton)" type="number" value={miningCost} onChange={(e) => setMiningCost(e.target.value)} placeholder="35.00" />
            <CInput id="processing-cost" label="Processing Cost (USD/ton)" type="number" value={processingCost} onChange={(e) => setProcessingCost(e.target.value)} placeholder="18.50" />
            <CInput id="recovery-factor" label="Recovery Factor (%)" type="number" value={recoveryFactor} onChange={(e) => setRecoveryFactor(e.target.value)} placeholder="92.5" />
          </div>
          <div className="mt-6 flex justify-end">
            <CButton variant="solid" size="md">
              Save Parameters
            </CButton>
          </div>
        </div>
      </section>

      {/* ── Knowledge Base Audit ────────────────────────────── */}
      <section className="mt-10 mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Knowledge Base Audit
            </h2>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedCount} / {kbDocs.length} active
            </span>
          </div>
          <div className="flex items-center gap-2">
            {kbEditMode ? (
              <>
                <CButton variant="ghost" size="sm" onClick={() => setKbEditMode(false)}>
                  Cancel
                </CButton>
                <CButton variant="solid" size="sm" onClick={handleSaveKB}>
                  Save Changes
                </CButton>
              </>
            ) : (
              <CButton variant="outline" size="sm" onClick={() => setKbEditMode(true)}>
                <FileTextIcon className="h-3 w-3" />
                Update Knowledge Base
              </CButton>
            )}
          </div>
        </div>

        {/* Upload zone (visible in edit mode) */}
        {kbEditMode && (
          <div
            className={cn(
              "mb-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-climb-fast cursor-pointer animate-fade-in-up",
              uploadDragOver
                ? "border-climb-mint bg-climb-mint-subtle"
                : "border-border hover:border-muted-foreground"
            )}
            onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
            onDragLeave={() => setUploadDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setUploadDragOver(false); handleFakeUpload(); }}
            onClick={handleFakeUpload}
          >
            <UploadIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Upload Documents</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Drag & drop or click to browse (PDF, CSV, TIFF)
              </p>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="mb-3 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents..."
            value={kbSearch}
            onChange={(e) => {
              setKbSearch(e.target.value);
              setKbPage(1);
            }}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-climb-1 overflow-hidden">
          {/* Table Header */}
          <div
            className={cn(
              "grid gap-4 px-5 py-3 border-b border-border bg-muted/30",
              kbEditMode ? "grid-cols-12" : "grid-cols-12"
            )}
          >
            {kbEditMode && (
              <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active
              </span>
            )}
            <span className={cn(
              "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider",
              kbEditMode ? "col-span-5" : "col-span-5"
            )}>
              Document
            </span>
            <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </span>
            <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Size
            </span>
            <span className={cn(
              "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider",
              kbEditMode ? "col-span-1" : "col-span-2"
            )}>
              Chunks
            </span>
            {!kbEditMode && (
              <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Uploaded
              </span>
            )}
            {kbEditMode && (
              <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Uploaded
              </span>
            )}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {pagedDocs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No documents found.</p>
              </div>
            ) : (
              pagedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-5 py-3 transition-colors duration-climb-fast",
                    kbEditMode
                      ? "cursor-pointer hover:bg-muted/30"
                      : "hover:bg-muted/30",
                    kbEditMode && !doc.selected && "opacity-50"
                  )}
                  onClick={kbEditMode ? () => toggleDoc(doc.id) : undefined}
                >
                  {kbEditMode && (
                    <div className="col-span-1 flex items-center">
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-climb-fast",
                          doc.selected
                            ? "border-climb-mint bg-climb-mint"
                            : "border-muted-foreground"
                        )}
                      >
                        {doc.selected && (
                          <CheckIcon className="text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center gap-2 min-w-0",
                    kbEditMode ? "col-span-5" : "col-span-5"
                  )}>
                    <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground truncate">
                      {doc.name}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <CBadge variant={doc.type === "VEC" ? "ore" : "default"}>
                      {doc.type}
                    </CBadge>
                  </div>
                  <span className="col-span-2 font-mono text-xs text-muted-foreground self-center">
                    {doc.size}
                  </span>
                  <span className={cn(
                    "font-mono text-xs text-foreground self-center",
                    kbEditMode ? "col-span-1" : "col-span-2"
                  )}>
                    {doc.chunks.toLocaleString()}
                  </span>
                  {!kbEditMode && (
                    <span className="col-span-2 text-xs text-muted-foreground self-center">
                      {doc.uploadedAt}
                    </span>
                  )}
                  {kbEditMode && (
                    <span className="col-span-2 text-xs text-muted-foreground self-center">
                      {doc.uploadedAt}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Summary + Pagination */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {selectedCount} active | {totalChunks.toLocaleString()} embedded chunks
            </span>

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setKbPage((p) => Math.max(1, p - 1))}
                disabled={kbPage <= 1}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  kbPage <= 1
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>

              {getPaginationNumbers(kbPage, totalKbPages).map((p, idx) =>
                p === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setKbPage(p)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      kbPage === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setKbPage((p) => Math.min(totalKbPages, p + 1))}
                disabled={kbPage >= totalKbPages}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  kbPage >= totalKbPages
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label="Next page"
              >
                <ChevronRightSmallIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Knowledge Info */}
        <div className="mt-4">
          <InsightCard
            icon={<BrainIcon className="h-4 w-4" />}
            title="Knowledge Pipeline Status"
          >
            <p className="text-xs leading-relaxed">
              RAG pipeline is active with{" "}
              <strong className="text-foreground">{totalChunks.toLocaleString()} embedded chunks</strong> across {selectedCount}{" "}
              active documents. The latest auto-injected lesson from reconciliation
              feedback was added on 2024-04-10. Next scheduled re-embedding: 24 hours.
            </p>
          </InsightCard>
        </div>
      </section>

      {/* Toast */}
      <Toast
        message={toastMessage}
        type="success"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
