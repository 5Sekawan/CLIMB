"use client";

import React from "react";
import { useState, useCallback, useRef } from "react";
import { CButton, CInput, CBadge, VoxelLegend } from "@/components/climb/ui";
import {
  ArrowLeftIcon,
  MountainIcon,
  MapPinIcon,
  PlusIcon,
  FileTextIcon,
  UploadIcon,
  DatabaseIcon,
} from "@/components/climb/icons";
import { Toast } from "@/components/climb/toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Coordinate Helpers ──────────────────────────────────────
function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const cleaned = input.replace(/\s/g, "");
  const decimalMatch = cleaned.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (decimalMatch) {
    return {
      lat: parseFloat(decimalMatch[1]),
      lng: parseFloat(decimalMatch[2]),
    };
  }
  const dmsMatch = cleaned.match(
    /^(\d+\.?\d*)([NSns]),(\d+\.?\d*)([EWew])$/
  );
  if (dmsMatch) {
    let lat = parseFloat(dmsMatch[1]);
    let lng = parseFloat(dmsMatch[3]);
    if (dmsMatch[2].toLowerCase() === "s") lat = -lat;
    if (dmsMatch[4].toLowerCase() === "w") lng = -lng;
    return { lat, lng };
  }
  return null;
}

// Indonesia approximate bounding box
const BOUNDS = { minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 };
const MAP_W = 800;
const MAP_H = 600;

function latLngToPixel(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W,
    y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H,
  };
}

function pixelToLatLng(x: number, y: number, width: number, height: number) {
  return {
    lat: parseFloat(
      (
        BOUNDS.maxLat -
        (y / height) * (BOUNDS.maxLat - BOUNDS.minLat)
      ).toFixed(4)
    ),
    lng: parseFloat(
      (
        BOUNDS.minLng +
        (x / width) * (BOUNDS.maxLng - BOUNDS.minLng)
      ).toFixed(4)
    ),
  };
}

// ─── Mock Knowledge Base Documents ───────────────────────────
interface KBDocument {
  id: string;
  name: string;
  type: "PDF" | "CSV" | "VEC" | "TIFF";
  size: string;
  chunks: number;
  selected: boolean;
}

const defaultDocs: KBDocument[] = [
  { id: "kb-1", name: "NI 43-101 Technical Report - East Kalimantan 2023", type: "PDF", size: "4.2 MB", chunks: 347, selected: true },
  { id: "kb-2", name: "USGS Mineral Resources Data System - Indonesia", type: "CSV", size: "12.8 MB", chunks: 1240, selected: true },
  { id: "kb-3", name: "Geological Survey of Indonesia - Sulawesi Region", type: "PDF", size: "8.1 MB", chunks: 582, selected: false },
  { id: "kb-4", name: "Epithermal Gold Systems - Classification Guide", type: "PDF", size: "2.3 MB", chunks: 198, selected: true },
  { id: "kb-5", name: "SWIR Spectral Analysis Methodology Paper", type: "PDF", size: "1.7 MB", chunks: 142, selected: false },
  { id: "kb-6", name: "Lessons Learned - Thermal Bias Correction (Auto)", type: "VEC", size: "0.4 MB", chunks: 7, selected: true },
];

// ─── Small Icons ─────────────────────────────────────────────
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4", className)}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("h-3 w-3", className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-3.5 w-3.5", className)}>
      <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function CreateNewAOIPage() {
  const router = useRouter();
  const mapRef = useRef<SVGSVGElement>(null);

  // Step state (4 steps)
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Project Name
  const [projectName, setProjectName] = useState("");

  // Step 2: Location (multiple pins forming polygon)
  const [pins, setPins] = useState<{ lat: number; lng: number }[]>([]);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [coordError, setCoordError] = useState("");

  // Drag state for pins on SVG map
  const [draggingPinIndex, setDraggingPinIndex] = useState<number | null>(null);

  // Step 3: Knowledge Base
  const [documents, setDocuments] = useState<KBDocument[]>(defaultDocs);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);

  // Toast / Saving
  const [toastVisible, setToastVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = [
    { label: "Project Name", description: "Enter a name for the Area of Interest" },
    { label: "Add Location", description: "Place pins on the map to define AOI boundary" },
    { label: "Knowledge Base", description: "Select documents for the RAG knowledge pipeline" },
    { label: "Review & Save", description: "Review project summary and confirm" },
  ];

  // ─── Step 2 handlers ────────────────────────────────────
  const addPinFromInput = useCallback(() => {
    if (!coordinateInput.trim()) {
      setCoordError("Please enter coordinates");
      return;
    }
    const result = parseCoordinates(coordinateInput.trim());
    if (!result) {
      setCoordError("Invalid format. Use: -2.5, 115.3 or 2.5S, 115.3E");
      return;
    }
    if (result.lat < BOUNDS.minLat || result.lat > BOUNDS.maxLat || result.lng < BOUNDS.minLng || result.lng > BOUNDS.maxLng) {
      setCoordError("Coordinates outside Indonesia region");
      return;
    }
    setCoordError("");
    setPins((prev) => [...prev, result]);
    setCoordinateInput("");
  }, [coordinateInput]);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (currentStep !== 1) return;
      // If we are dragging, don't place a new pin
      if (draggingPinIndex !== null) return;
      const svg = mapRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = pixelToLatLng(x, y, rect.width, rect.height);
      setPins((prev) => [...prev, coords]);
      setCoordError("");
    },
    [currentStep, draggingPinIndex]
  );

  const removePin = useCallback((index: number) => {
    setPins((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ─── SVG Pin Drag Handlers ─────────────────────────────
  const handlePinMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      e.preventDefault();
      setDraggingPinIndex(index);
    },
    []
  );

  const handleMapMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (draggingPinIndex === null) return;
      const svg = mapRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = pixelToLatLng(x, y, rect.width, rect.height);
      setPins((prev) =>
        prev.map((p, i) => (i === draggingPinIndex ? coords : p))
      );
    },
    [draggingPinIndex]
  );

  const handleMapMouseUp = useCallback(() => {
    setDraggingPinIndex(null);
  }, []);

  // ─── Step 3 handlers ────────────────────────────────────
  const toggleDocument = useCallback((docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, selected: !d.selected } : d))
    );
  }, []);

  const handleFakeUpload = useCallback(() => {
    const fakeName = `uploaded-document-${uploadedFiles.length + 1}.pdf`;
    setUploadedFiles((prev) => [...prev, { name: fakeName, size: "2.1 MB" }]);
    setDocuments((prev) => [
      ...prev,
      {
        id: `uploaded-${Date.now()}`,
        name: fakeName,
        type: "PDF",
        size: "2.1 MB",
        chunks: 0,
        selected: true,
      },
    ]);
  }, [uploadedFiles.length]);

  // ─── Navigation ─────────────────────────────────────────
  const canProceed =
    currentStep === 0
      ? projectName.trim().length >= 2
      : currentStep === 1
        ? pins.length >= 1
        : currentStep === 2
          ? documents.some((d) => d.selected)
          : true;

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToastVisible(true);
      setTimeout(() => router.push("/explorer"), 2000);
    }, 1200);
  }, [router]);

  // ─── Map polygon points ─────────────────────────────────
  const pinPixels = pins.map((p) => latLngToPixel(p.lat, p.lng));
  const polygonPoints = pinPixels.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
        <Link
          href="/explorer"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-climb-fast hover:bg-muted hover:text-foreground"
          aria-label="Back to Explorer"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <PlusIcon className="h-4 w-4 shrink-0 text-climb-mint" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            Create New AOI
          </h1>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ───────────────────────────────────── */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-border bg-card">
          {/* Step Indicator */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-2">
              {steps.map((step, idx) => (
                <React.Fragment key={step.label}>
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-climb-fast",
                      idx < currentStep && "bg-climb-mint text-primary-foreground",
                      idx === currentStep && "bg-primary text-primary-foreground shadow-climb-1",
                      idx > currentStep && "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx < currentStep ? <CheckIcon /> : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1 transition-colors duration-climb-fast",
                        idx < currentStep ? "bg-climb-mint" : "bg-border"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3">
              <h2 className="text-sm font-semibold text-foreground">
                {steps[currentStep].label}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* ── Step 0: Project Name ─────────────────────── */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-5 animate-fade-in-up">
                <CInput
                  id="project-name"
                  label="Project Name"
                  placeholder="e.g. Pit Berau X, Pit Kalimantan S2"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a descriptive name for your Area of Interest.
                    This will be used as the project identifier across CLIMB.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 1: Location (multi-pin polygon) ─────── */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-5 animate-fade-in-up">
                {/* Coordinate input */}
                <div>
                  <CInput
                    id="coordinates"
                    label="Add Coordinate"
                    placeholder="-2.5, 115.3  or  2.5S, 115.3E"
                    value={coordinateInput}
                    onChange={(e) => {
                      setCoordinateInput(e.target.value);
                      setCoordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPinFromInput();
                    }}
                  />
                  {coordError && (
                    <p className="mt-1.5 text-xs text-climb-drifting">
                      {coordError}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <CButton variant="outline" size="sm" onClick={addPinFromInput}>
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add Coordinate
                    </CButton>
                    <span className="text-xs text-muted-foreground">
                      or click on the map
                    </span>
                  </div>
                </div>

                {/* Pin list */}
                {pins.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Pins ({pins.length})
                      </span>
                      {pins.length >= 3 && (
                        <CBadge variant="ore">Polygon Formed</CBadge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {pins.map((pin, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 group"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-climb-mint text-[10px] font-bold text-primary-foreground">
                            {i + 1}
                          </div>
                          <GripIcon className="shrink-0 text-muted-foreground/50" />
                          <span className="flex-1 font-mono text-xs text-foreground">
                            {pin.lat}, {pin.lng}
                          </span>
                          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            drag on map
                          </span>
                          <button
                            type="button"
                            onClick={() => removePin(i)}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove pin ${i + 1}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pins.length === 0
                      ? "Click on the map or enter coordinates to place pins. Add 3+ pins to form an AOI polygon boundary."
                      : pins.length < 3
                        ? `Add ${3 - pins.length} more pin${3 - pins.length > 1 ? "s" : ""} to form a polygon. Drag pins on the map to reposition them.`
                        : "Polygon boundary defined. Drag any pin on the map to adjust. Keep adding pins to refine the shape."}
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 2: Knowledge Base ───────────────────── */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-5 animate-fade-in-up">
                {/* Upload Zone */}
                <div
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-climb-fast cursor-pointer",
                    uploadDragOver
                      ? "border-climb-mint bg-climb-mint-subtle"
                      : "border-border hover:border-muted-foreground"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setUploadDragOver(true);
                  }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUploadDragOver(false);
                    handleFakeUpload();
                  }}
                  onClick={handleFakeUpload}
                >
                  <UploadIcon className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Upload Documents
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Drag & drop or click to browse (PDF, CSV, TIFF)
                    </p>
                  </div>
                </div>

                {/* Document checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Knowledge Documents
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {documents.filter((d) => d.selected).length} / {documents.length} selected
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleDocument(doc.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-climb-fast",
                          doc.selected
                            ? "border-climb-mint/30 bg-climb-mint-subtle"
                            : "border-border bg-card hover:bg-muted/30"
                        )}
                      >
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
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className={cn(
                              "text-xs font-medium truncate",
                              doc.selected ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {doc.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <CBadge variant={doc.type === "VEC" ? "ore" : "default"}>
                              {doc.type}
                            </CBadge>
                            <span className="text-[10px] text-muted-foreground">
                              {doc.size}
                            </span>
                            {doc.chunks > 0 && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {doc.chunks} chunks
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-start gap-2">
                    <DatabaseIcon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Selected documents will be embedded into the RAG knowledge
                      pipeline for this project. The AI will use these as
                      context for geological inference and analysis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Review & Save ────────────────────── */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-5 animate-fade-in-up">
                <div className="rounded-xl border border-border bg-card p-5 shadow-climb-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Project Summary
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Project Name
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {projectName}
                      </p>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        AOI Boundary
                      </span>
                      <p className="mt-0.5 text-sm text-foreground">
                        {pins.length} pin{pins.length !== 1 ? "s" : ""}
                        {pins.length >= 3 ? " (Polygon)" : pins.length === 2 ? " (Line)" : " (Point)"}
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1 max-h-24 overflow-y-auto">
                        {pins.map((p, i) => (
                          <span key={i} className="font-mono text-xs text-muted-foreground">
                            Pin {i + 1}: {p.lat}, {p.lng}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Knowledge Base
                      </span>
                      <p className="mt-0.5 text-sm text-foreground">
                        {documents.filter((d) => d.selected).length} documents selected
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        {documents
                          .filter((d) => d.selected)
                          .reduce((sum, d) => sum + d.chunks, 0)
                          .toLocaleString()}{" "}
                        total chunks
                      </p>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Status
                      </span>
                      <p className="mt-0.5 text-sm font-medium text-climb-mint">
                        Active (New)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    After saving, you can open this project in the Explorer
                    studio to upload data layers, define mineral layers,
                    configure economic parameters, and run AI inference.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ──────────────────────────── */}
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <CButton
                  variant="ghost"
                  size="md"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="flex-1"
                >
                  Back
                </CButton>
              )}
              {currentStep < steps.length - 1 ? (
                <CButton
                  variant="solid"
                  size="md"
                  disabled={!canProceed}
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="flex-1"
                >
                  Continue
                </CButton>
              ) : (
                <CButton
                  variant="solid"
                  size="md"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <MountainIcon className="h-4 w-4" />
                      Save Project
                    </>
                  )}
                </CButton>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Interactive Map (matches MapCanvas style) ── */}
        <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" className="text-primary/20">
              <defs>
                <pattern id="create-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#create-grid)" />
            </svg>
          </div>

          {/* Terrain contours (same as MapCanvas) */}
          <svg
            className="absolute inset-0 h-full w-full opacity-30 pointer-events-none"
            viewBox="0 0 800 600"
            preserveAspectRatio="none"
          >
            <path d="M0 400 Q100 350 200 380 Q350 330 400 360 Q500 300 600 340 Q700 310 800 350 L800 600 L0 600 Z" fill="hsl(160 40% 20%)" opacity="0.5" />
            <path d="M0 420 Q150 380 250 400 Q400 360 500 390 Q650 350 800 380 L800 600 L0 600 Z" fill="hsl(160 40% 15%)" opacity="0.5" />
          </svg>

          {/* Interactive SVG Map */}
          <svg
            ref={mapRef}
            className={cn(
              "absolute inset-0 h-full w-full",
              currentStep === 1
                ? draggingPinIndex !== null
                  ? "cursor-grabbing"
                  : "cursor-crosshair"
                : "cursor-default"
            )}
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid meet"
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
          >
            <rect width="800" height="600" fill="transparent" />

            {/* Indonesia silhouette */}
            <g className="opacity-30">
              <path d="M120,250 L160,210 L180,230 L200,190 L220,200 L210,250 L190,290 L160,320 L130,310 Z" fill="hsl(160 40% 25%)" stroke="hsl(160 60% 35%)" strokeWidth="1" />
              <path d="M220,380 L300,375 L360,380 L380,385 L340,395 L280,390 L230,390 Z" fill="hsl(160 40% 25%)" stroke="hsl(160 60% 35%)" strokeWidth="1" />
              <path d="M280,180 L330,150 L380,160 L400,200 L390,260 L360,290 L320,300 L290,280 L270,240 Z" fill="hsl(160 40% 25%)" stroke="hsl(160 60% 35%)" strokeWidth="1" />
              <path d="M420,180 L440,150 L460,170 L450,210 L470,230 L460,260 L440,250 L430,220 L410,210 Z" fill="hsl(160 40% 25%)" stroke="hsl(160 60% 35%)" strokeWidth="1" />
              <path d="M560,200 L620,170 L670,180 L700,190 L690,230 L660,260 L610,270 L580,250 L560,220 Z" fill="hsl(160 40% 25%)" stroke="hsl(160 60% 35%)" strokeWidth="1" />
              <path d="M410,380 L440,375 L460,378 L450,390 L420,388 Z" fill="hsl(160 40% 22%)" stroke="hsl(160 60% 35%)" strokeWidth="0.8" />
              <path d="M470,375 L495,370 L510,375 L500,385 L475,383 Z" fill="hsl(160 40% 22%)" stroke="hsl(160 60% 35%)" strokeWidth="0.8" />
              <path d="M510,220 L530,210 L540,230 L530,250 L515,240 Z" fill="hsl(160 40% 22%)" stroke="hsl(160 60% 35%)" strokeWidth="0.8" />
            </g>

            {/* AOI Polygon from pins */}
            {pinPixels.length >= 3 && (
              <polygon
                points={polygonPoints}
                fill="hsl(160 84% 39% / 0.08)"
                stroke="hsl(160 84% 39%)"
                strokeWidth="2"
                strokeDasharray="8,4"
              />
            )}

            {/* Lines between pins (if 2) */}
            {pinPixels.length === 2 && (
              <polyline
                points={polygonPoints}
                fill="none"
                stroke="hsl(160 84% 39%)"
                strokeWidth="2"
                strokeDasharray="8,4"
              />
            )}

            {/* Coordinate markers on polygon vertices (like MapCanvas) */}
            {pinPixels.length >= 3 &&
              pinPixels.map((p, i) => (
                <circle
                  key={`vertex-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="hsl(160 84% 39%)"
                  stroke="white"
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
              ))}

            {/* Draggable Pin markers */}
            {pinPixels.map((p, i) => (
              <g
                key={i}
                className={cn(
                  currentStep === 1 ? "cursor-grab" : "",
                  draggingPinIndex === i && "cursor-grabbing"
                )}
                onMouseDown={(e) => handlePinMouseDown(e, i)}
              >
                {/* Outer ring - grab target area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="16"
                  fill="transparent"
                />
                {/* Hover ring */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="none"
                  stroke={draggingPinIndex === i ? "hsl(160 84% 39%)" : "hsl(160 84% 39% / 0.3)"}
                  strokeWidth="1.5"
                  className="transition-all"
                />
                {/* Pulse ring on latest or dragging pin */}
                {(i === pinPixels.length - 1 || draggingPinIndex === i) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="18"
                    fill="none"
                    stroke="hsl(160 84% 39%)"
                    strokeWidth="1.5"
                    opacity="0.3"
                    className="animate-ai-pulse"
                  />
                )}
                {/* Pin dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={draggingPinIndex === i ? 7 : 5}
                  fill="hsl(160 84% 39%)"
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all"
                />
                {/* Pin number label */}
                <rect
                  x={p.x + 10}
                  y={p.y - 12}
                  width="24"
                  height="20"
                  rx="4"
                  fill="hsl(0 0% 0% / 0.7)"
                />
                <text
                  x={p.x + 22}
                  y={p.y + 2}
                  fill="white"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>

          {/* Voxel grid preview (when polygon is formed) */}
          {pinPixels.length >= 3 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="grid grid-cols-8 grid-rows-6 gap-1 p-8 opacity-50">
                {Array.from({ length: 48 }).map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const dist = Math.sqrt(
                    Math.pow(row - 3, 2) + Math.pow(col - 4, 2)
                  );
                  const grade = Math.max(0.1, 1 - dist * 0.15);
                  const isHighGrade = grade > 0.6;
                  const isMidGrade = grade > 0.35 && grade <= 0.6;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "h-8 w-10 rounded-sm border",
                        isHighGrade && "bg-climb-mint/60 border-climb-mint/40",
                        isMidGrade && "bg-climb-marginal/40 border-climb-marginal/30",
                        !isHighGrade && !isMidGrade && "bg-climb-waste/20 border-climb-waste/15"
                      )}
                      style={{
                        opacity: Math.max(0.2, grade),
                        transform: `perspective(600px) rotateX(35deg) rotateZ(-15deg) translateY(${row * 2}px)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Map info overlays based on step */}
          {currentStep === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl bg-black/50 px-6 py-4 backdrop-blur-sm text-center">
                <MountainIcon className="mx-auto h-6 w-6 text-climb-mint mb-2" />
                <p className="text-sm font-medium text-white/90">
                  Enter a project name to begin
                </p>
                <p className="text-xs text-white/50 mt-1">
                  The map will be available in the next step
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && pins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl bg-black/50 px-6 py-4 backdrop-blur-sm text-center">
                <MapPinIcon className="mx-auto h-6 w-6 text-climb-mint mb-2" />
                <p className="text-sm font-medium text-white/90">
                  Click on the map to place pins
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Add 3+ pins to form an AOI polygon boundary. Drag pins to reposition.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl bg-black/50 px-6 py-4 backdrop-blur-sm text-center">
                <FileTextIcon className="mx-auto h-6 w-6 text-climb-mint mb-2" />
                <p className="text-sm font-medium text-white/90">
                  Configure Knowledge Base
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Select documents for the RAG pipeline
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl bg-black/50 px-6 py-4 backdrop-blur-sm text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="2" className="mx-auto h-8 w-8 mb-2">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm font-medium text-white/90">
                  Ready to save
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Review the summary and click Save Project
                </p>
              </div>
            </div>
          )}

          {/* Project name badge */}
          {projectName && (
            <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-semibold text-white/90">
                {projectName}
              </span>
            </div>
          )}

          {/* Coordinate readout */}
          <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm">
            {pins.length > 0
              ? `${pins.length} pin${pins.length !== 1 ? "s" : ""} placed`
              : "-- , --"}
            {" | Indonesia Region"}
          </div>

          {/* Voxel legend (when polygon formed) */}
          {pinPixels.length >= 3 && (
            <VoxelLegend
              mineralName="Grade Preview"
              unit="(estimated)"
              minValue={0.0}
              maxValue={5.0}
              className="absolute bottom-4 right-4"
            />
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast
        message="Project saved successfully! Redirecting to Explorer..."
        type="success"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
