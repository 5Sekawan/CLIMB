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
} from "@/components/climb/icons";
import { useState } from "react";

// ─── API Keys ────────────────────────────────────────────────
const apiConnections = [
  {
    id: "gee",
    name: "Google Earth Engine",
    icon: GlobeIcon,
    status: "connected" as const,
    lastChecked: "2 min ago",
  },
  {
    id: "vertex",
    name: "Vertex AI (Gemini)",
    icon: BrainIcon,
    status: "connected" as const,
    lastChecked: "5 min ago",
  },
  {
    id: "bigquery",
    name: "BigQuery GIS",
    icon: DatabaseIcon,
    status: "connected" as const,
    lastChecked: "1 min ago",
  },
  {
    id: "mongodb",
    name: "MongoDB (GCP VM)",
    icon: DatabaseIcon,
    status: "error" as const,
    lastChecked: "30 min ago",
  },
];

// ─── Knowledge Base ──────────────────────────────────────────
const knowledgeDocuments = [
  {
    id: 1,
    name: "NI 43-101 Technical Report - East Kalimantan 2023",
    type: "PDF",
    size: "4.2 MB",
    chunks: 347,
    uploadedAt: "2024-01-15",
  },
  {
    id: 2,
    name: "USGS Mineral Resources Data System - Indonesia",
    type: "CSV",
    size: "12.8 MB",
    chunks: 1240,
    uploadedAt: "2024-01-10",
  },
  {
    id: 3,
    name: "Geological Survey of Indonesia - Sulawesi Region",
    type: "PDF",
    size: "8.1 MB",
    chunks: 582,
    uploadedAt: "2024-02-01",
  },
  {
    id: 4,
    name: "Epithermal Gold Systems - Classification Guide",
    type: "PDF",
    size: "2.3 MB",
    chunks: 198,
    uploadedAt: "2024-02-05",
  },
  {
    id: 5,
    name: "SWIR Spectral Analysis Methodology Paper",
    type: "PDF",
    size: "1.7 MB",
    chunks: 142,
    uploadedAt: "2024-02-10",
  },
  {
    id: 6,
    name: "Lessons Learned - Thermal Bias Correction (Auto)",
    type: "VEC",
    size: "0.4 MB",
    chunks: 7,
    uploadedAt: "2024-02-15",
  },
];

export default function SettingsPage() {
  const [auPrice, setAuPrice] = useState("2045.00");
  const [cuPrice, setCuPrice] = useState("8.42");
  const [miningCost, setMiningCost] = useState("35.00");
  const [processingCost, setProcessingCost] = useState("18.50");
  const [recoveryFactor, setRecoveryFactor] = useState("92.5");

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

      {/* Section: API Key Manager */}
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
                  <span className="text-sm font-medium text-foreground">
                    {api.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Last checked: {api.lastChecked}
                  </span>
                </div>
                <CBadge
                  variant={
                    api.status === "connected" ? "stable" : "drifting"
                  }
                >
                  {api.status === "connected" ? "Connected" : "Error"}
                </CBadge>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section: Economic Parameters */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <DollarIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Economic Parameters
          </h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-climb-1">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CInput
              id="au-price"
              label="Gold Price (USD/oz)"
              type="number"
              value={auPrice}
              onChange={(e) => setAuPrice(e.target.value)}
              placeholder="2045.00"
            />
            <CInput
              id="cu-price"
              label="Copper Price (USD/lb)"
              type="number"
              value={cuPrice}
              onChange={(e) => setCuPrice(e.target.value)}
              placeholder="8.42"
            />
            <CInput
              id="mining-cost"
              label="Mining Cost (USD/ton)"
              type="number"
              value={miningCost}
              onChange={(e) => setMiningCost(e.target.value)}
              placeholder="35.00"
            />
            <CInput
              id="processing-cost"
              label="Processing Cost (USD/ton)"
              type="number"
              value={processingCost}
              onChange={(e) => setProcessingCost(e.target.value)}
              placeholder="18.50"
            />
            <CInput
              id="recovery-factor"
              label="Recovery Factor (%)"
              type="number"
              value={recoveryFactor}
              onChange={(e) => setRecoveryFactor(e.target.value)}
              placeholder="92.5"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <CButton variant="solid" size="md">
              Save Parameters
            </CButton>
          </div>
        </div>
      </section>

      {/* Section: Knowledge Base Audit */}
      <section className="mt-10 mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Knowledge Base Audit
            </h2>
          </div>
          <CButton variant="outline" size="sm">
            <FileTextIcon className="h-3 w-3" />
            Upload Document
          </CButton>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-climb-1 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="col-span-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Document
            </span>
            <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </span>
            <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Size
            </span>
            <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Chunks
            </span>
            <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Uploaded
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {knowledgeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-muted/30 transition-colors duration-climb-fast"
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {doc.name}
                  </span>
                </div>
                <div className="col-span-1">
                  <CBadge
                    variant={doc.type === "VEC" ? "ore" : "default"}
                  >
                    {doc.type}
                  </CBadge>
                </div>
                <span className="col-span-2 font-mono text-xs text-muted-foreground self-center">
                  {doc.size}
                </span>
                <span className="col-span-2 font-mono text-xs text-foreground self-center">
                  {doc.chunks.toLocaleString()}
                </span>
                <span className="col-span-2 text-xs text-muted-foreground self-center">
                  {doc.uploadedAt}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Total: {knowledgeDocuments.length} documents |{" "}
              {knowledgeDocuments
                .reduce((sum, d) => sum + d.chunks, 0)
                .toLocaleString()}{" "}
              embedded chunks
            </span>
            <span className="text-xs text-muted-foreground">
              Vector Store: BigQuery Vector Search
            </span>
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
              <strong className="text-foreground">2,516 embedded chunks</strong> across 6
              documents. The latest auto-injected lesson from reconciliation
              feedback was added on 2024-02-15. Next scheduled re-embedding:
              24 hours.
            </p>
          </InsightCard>
        </div>
      </section>
    </div>
  );
}
