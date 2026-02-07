"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Map, AdvancedMarker, MapMouseEvent, useMap } from "@vis.gl/react-google-maps";

import { CButton, CInput, CBadge } from "@/components/climb/ui";
import {
  ArrowLeftIcon,
  MountainIcon,
  PlusIcon,
  FileTextIcon,
  UploadIcon,
  DatabaseIcon,
  TrashIcon,
  CheckIcon,
  GripIcon,
  MapPinIcon,
} from "@/components/climb/icons";
import { Toast } from "@/components/climb/toast";
import { cn, parseCoordinates } from "@/lib/utils";
import { useCreateProject, useUploadDocument } from "@/hooks/use-projects";
import { kinks, polygon } from "@turf/turf";

// ─── Constants ────────────────────────────────────────────────
const INDONESIA_CENTER = { lat: -2.5489, lng: 118.0149 };
const DEFAULT_ZOOM = 5;

// ─── Types ────────────────────────────────────────────────────
interface KBDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  chunks: number;
  selected: boolean;
  status: 'uploading' | 'ready' | 'error';
}

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Project Name", description: "Enter a name for the Area of Interest" },
  { label: "Add Location", description: "Place pins on the map to define AOI boundary" },
  { label: "Knowledge Base", description: "Select documents for the RAG knowledge pipeline" },
  { label: "Review & Save", description: "Review project summary and confirm" },
];

// ─── Helper Components ────────────────────────────────────────
function getCenter(points: google.maps.LatLngLiteral[]) {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}

function sortPointsClockwise(points: google.maps.LatLngLiteral[]) {
  if (points.length < 3) return points;
  const center = getCenter(points);
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.lng - center.lng, a.lat - center.lat);
    const angleB = Math.atan2(b.lng - center.lng, b.lat - center.lat);
    return angleB - angleA; // Clockwise
  });
}

function PolygonLayer({ points }: { points: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  // Auto-sort points to prevent self-intersections
  const sortedPoints = useMemo(() => sortPointsClockwise(points), [points]);

  React.useEffect(() => {
    if (!map) return;

    if (!polygonRef.current) {
      polygonRef.current = new google.maps.Polygon({
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#10B981",
        fillOpacity: 0.15,
      });
      polygonRef.current.setMap(map);
    }

    // Update paths with sorted points
    polygonRef.current.setPath(sortedPoints);

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    };
  }, [map, sortedPoints]);

  return null;
}

export default function CreateNewAOIPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Hooks
  const createProject = useCreateProject();
  const uploadDocument = useUploadDocument();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  
  // Location State
  const [pins, setPins] = useState<google.maps.LatLngLiteral[]>([]);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [coordError, setCoordError] = useState("");

  // KB State
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [uploadDragOver, setUploadDragOver] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  // Ref to track dragging state to prevent map click conflict
  const isDraggingMarker = useRef(false);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    // Prevent adding a point if we just finished dragging a marker
    if (isDraggingMarker.current) return;
    
    if (currentStep !== 1 || !e.detail.latLng) return;
    setPins(prev => [...prev, { lat: e.detail.latLng!.lat, lng: e.detail.latLng!.lng }]);
    setCoordError("");
  }, [currentStep]);

  const handleMarkerDragStart = useCallback(() => {
    isDraggingMarker.current = true;
  }, []);

  const handleMarkerDragEnd = useCallback((index: number, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setPins(prev => {
      const newPins = [...prev];
      newPins[index] = { lat: e.latLng!.lat(), lng: e.latLng!.lng() };
      return newPins;
    });
    
    // Reset dragging flag after a short delay to ensure click event doesn't fire
    setTimeout(() => {
      isDraggingMarker.current = false;
    }, 100);
  }, []);

  const addPinFromInput = useCallback(() => {
    if (!coordinateInput.trim()) {
      setCoordError("Please enter coordinates");
      return;
    }
    const result = parseCoordinates(coordinateInput.trim());
    if (!result) {
      setCoordError("Invalid format. Use: -2.5, 115.3");
      return;
    }
    setPins(prev => [...prev, result]);
    setCoordinateInput("");
    setCoordError("");
  }, [coordinateInput]);

  const removePin = useCallback((index: number) => {
    setPins(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Upload Handlers
  const processFile = useCallback(async (file: File) => {
    const tempId = `temp-${Date.now()}`;
    const fileSize = (file.size / 1024 / 1024).toFixed(1) + " MB";
    
    setDocuments(prev => [...prev, {
      id: tempId,
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      size: fileSize,
      chunks: 0,
      selected: true,
      status: 'uploading'
    }]);

    try {
      const result = await uploadDocument.mutateAsync(file);
      setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, id: result.id, status: 'ready' } : d));
    } catch (err) {
      console.error("Upload failed", err);
      setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, status: 'error' } : d));
      setToast({ visible: true, message: `Failed to upload ${file.name}`, type: "error" });
    }
  }, [uploadDocument]);

  const handleSave = useCallback(() => {
    if (projectName.length < 3 || pins.length < 3) return;

    // Use sorted pins for submission to ensure valid geometry
    const sortedPins = sortPointsClockwise(pins);

    // Validate Polygon (Self-Intersection Check)
    try {
      const coordinates = sortedPins.map(p => [p.lng, p.lat]);
      // Close the loop for turf validation
      const closedCoords = [...coordinates, coordinates[0]];
      const poly = polygon([closedCoords]);
      const invalid = kinks(poly);
      
      if (invalid.features.length > 0) {
        setToast({ 
          visible: true, 
          message: "Invalid Boundary: Lines cannot cross each other (Self-intersection).", 
          type: "error" 
        });
        return;
      }
    } catch (e) {
      console.error("Validation error", e);
    }

    createProject.mutate({
      name: projectName,
      pins: sortedPins, // Send sorted pins
      selectedDocuments: documents
        .filter(d => d.selected && d.status === 'ready')
        .map(d => d.id)
    }, {
      onSuccess: () => {
        setToast({ visible: true, message: "Project saved successfully!", type: "success" });
        setTimeout(() => router.push("/explorer"), 1500);
      },
      onError: (err: any) => {
        setToast({ visible: true, message: err.message || "Failed to save", type: "error" });
      }
    });
  }, [createProject, projectName, pins, documents, router]);

  // ─── Computed ─────────────────────────────────────────────────
  const canProceed =
    currentStep === 0 ? projectName.trim().length >= 2 :
    currentStep === 1 ? pins.length >= 3 :
    true;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
        <Link href="/explorer" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4 text-climb-mint" />
          <h1 className="text-sm font-semibold text-foreground">Create New AOI</h1>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (Wizard) ── */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-border bg-card">
          {/* Steps */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-2">
              {STEPS.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                    idx < currentStep ? "bg-climb-mint text-primary-foreground" :
                    idx === currentStep ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {idx < currentStep ? <CheckIcon className="h-3 w-3" /> : idx + 1}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("h-px flex-1 transition-colors", idx < currentStep ? "bg-climb-mint" : "bg-border")} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3">
              <h2 className="text-sm font-semibold text-foreground">{STEPS[currentStep].label}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{STEPS[currentStep].description}</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentStep === 0 && (
              <div className="space-y-4 animate-fade-in-up">
                <CInput 
                  label="Project Name" 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  placeholder="e.g. Pit Berau X" 
                  autoFocus
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <CInput 
                    label="Add Coordinates manually" 
                    value={coordinateInput} 
                    onChange={e => setCoordinateInput(e.target.value)} 
                    placeholder="-2.5, 115.3"
                    onKeyDown={e => e.key === 'Enter' && addPinFromInput()}
                  />
                  {coordError && <p className="text-xs text-red-500 mt-1">{coordError}</p>}
                  <CButton variant="outline" size="sm" className="mt-2 w-full" onClick={addPinFromInput}>
                    Add Point
                  </CButton>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Points ({pins.length})</span>
                    {pins.length >= 3 && <CBadge variant="ore">Valid Polygon</CBadge>}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {pins.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20 text-xs">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-climb-mint text-white font-bold text-[10px]">{i + 1}</div>
                        <span className="font-mono flex-1">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                        <button onClick={() => removePin(i)} className="text-muted-foreground hover:text-red-500">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in-up">
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                    uploadDragOver ? "border-climb-mint bg-climb-mint-subtle" : "border-border hover:border-muted-foreground"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUploadDragOver(false);
                    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
                  }}
                >
                  <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click or drag file to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, CSV supported</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Uploaded Documents</span>
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded border border-border">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                      </div>
                      {doc.status === 'uploading' && <span className="text-[10px] animate-pulse text-climb-mint">Uploading...</span>}
                      {doc.status === 'ready' && <CheckIcon className="h-3 w-3 text-climb-mint" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Project Name</span>
                    <p className="text-sm font-medium">{projectName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">AOI Definition</span>
                    <p className="text-sm">{pins.length} points defined</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Knowledge Base</span>
                    <p className="text-sm">{documents.length} documents attached</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="p-6 border-t border-border flex gap-3">
            {currentStep > 0 && (
              <CButton variant="ghost" onClick={() => setCurrentStep(s => s - 1)} className="flex-1">Back</CButton>
            )}
            {currentStep < STEPS.length - 1 ? (
              <CButton variant="solid" onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed} className="flex-1">Continue</CButton>
            ) : (
              <CButton variant="solid" onClick={handleSave} disabled={createProject.isPending} className="flex-1">
                {createProject.isPending ? "Saving..." : "Create Project"}
              </CButton>
            )}
          </div>
        </div>

        {/* ── Map View ── */}
        <div className="flex-1 relative bg-muted">
          {apiKey ? (
            <Map
              defaultCenter={INDONESIA_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              mapId="climb-map-dark" // Optional: Use a dark style map ID from GCP console
              onClick={handleMapClick}
              disableDefaultUI={true}
              className="h-full w-full"
            >
              {pins.map((p, i) => (
                <AdvancedMarker 
                  key={i} 
                  position={p} 
                  draggable={true} 
                  onDragStart={handleMarkerDragStart}
                  onDragEnd={(e) => handleMarkerDragEnd(i, e)}
                >
                  <div 
                    className="relative flex items-center justify-center -translate-y-1/2 cursor-grab active:cursor-grabbing"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removePin(i);
                    }}
                  >
                    <div className="h-3 w-3 rounded-full bg-climb-mint border-2 border-white shadow-md" />
                    <div className="absolute -top-6 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {i + 1}
                    </div>
                  </div>
                </AdvancedMarker>
              ))}
              {pins.length >= 3 && <PolygonLayer points={pins} />}
            </Map>
          ) : (
            <div className="flex h-full w-full items-center justify-center flex-col gap-4 text-center p-8 bg-slate-900 text-white">
              <DatabaseIcon className="h-12 w-12 text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-lg font-semibold">Google Maps API Key Missing</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables to enable the interactive map.
                </p>
              </div>
              {/* Fallback to Manual Input */}
              {currentStep === 1 && (
                <div className="mt-8 p-4 border border-white/10 rounded-lg bg-white/5">
                  <p className="text-sm mb-4">You can still enter coordinates manually in the sidebar.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Overlay Info */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white/80 font-mono">
            {pins.length} points | {pins.length >= 3 ? "Polygon Valid" : "Incomplete"}
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(p => ({...p, visible: false}))} />
    </div>
  );
}