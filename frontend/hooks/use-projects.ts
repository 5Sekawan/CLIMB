import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectDetail, ProjectSummary } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';

// --- Types (Temporary, mirroring backend response) ---
export interface ProjectResponse {
  data: any[]; // Using any[] to allow transformation from backend type to frontend type
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

// --- Helpers ---
const formatTonnage = (val?: number) => {
  if (!val) return "0 t";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M t`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K t`;
  return `${val} t`;
};

const formatTime = (date?: string) => {
  if (!date) return "Never";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (e) {
    return "Unknown";
  }
};

export interface ProjectSummary {
  id: string;
  name: string;
  location: string;
  minerals: string[];
  driftStatus: DriftStatus;
  lastInference: string;
  estimatedTonnage: string;
  confidence: number;
  status: ProjectStatus;
  // Reconciliation specific props
  reconciliationStats?: {
    avgVariance: number;
    blocksAnalyzed: number;
    blocksDrifting: number;
    blocksStable: number;
    modelBias: string;
    lastReconciliation: string;
  };
}

// ... existing code ...

// --- Hooks ---

export function useProjects(params?: { page?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get<ProjectResponse>('/projects', { params });
      
      // Transform Backend Data to Frontend Interface (ProjectSummary)
      const transformedProjects: ProjectSummary[] = data.data.map((p: any) => ({
        id: p._id || p.id,
        name: p.name,
        location: p.location || "Unknown Location",
        minerals: p.minerals || [],
        driftStatus: p.driftStatus || "stable",
        status: p.status || "active",
        confidence: p.confidence || 0,
        // Map Backend fields to Frontend expectations
        estimatedTonnage: formatTonnage(p.economicParams?.baseTonnage),
        lastInference: formatTime(p.lastInferenceAt),
        // Map Reconciliation Stats
        reconciliationStats: p.reconciliationStats ? {
          avgVariance: p.reconciliationStats.avgVariance,
          blocksAnalyzed: p.reconciliationStats.blocksAnalyzed,
          blocksDrifting: p.reconciliationStats.blocksDrifting,
          blocksStable: p.reconciliationStats.blocksStable,
          modelBias: p.reconciliationStats.modelBias,
          lastReconciliation: formatTime(p.reconciliationStats.lastReconciliationAt)
        } : undefined
      }));

      return { ...data, data: transformedProjects };
    },
  });
}

export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: any }>(`/projects/${id}`);
      const project = data.data;

      // Transform Backend Data to Frontend ProjectDetail Interface
      const transformedProject: ProjectDetail = {
        ...project,
        id: project._id || project.id,
        // Map minerals (string[]) to mineralLayers (object[])
        mineralLayers: (project.minerals || []).map((m: string) => {
          const meta = project.mineralMetadata?.[m];
          return {
            id: m,
            label: meta?.label || `${m} Mineral`,
            color: meta?.color || "bg-gray-400" // Default color
          };
        }),
        // Ensure defaults for nested objects to prevent UI crashes
        nearestDeposits: project.cachedContext?.nearestDeposits || [],
        ragContext: {
          shortText: project.cachedContext?.ragSummary?.short || "No geological summary available yet.",
          longText: project.cachedContext?.ragSummary?.long || "",
          sourceRef: project.cachedContext?.ragSummary?.sourceRef || "System"
        },
        aiSummary: project.cachedContext?.ragSummary?.long || "Pending AI analysis...",
        surfaceFeatures: project.cachedContext?.surfaceFeatures,
        // Flatten Economic Params
        cogDefault: project.economicParams?.cogDefault ?? 0.5,
        baseTonnage: project.economicParams?.baseTonnage ?? 0,
        baseNetValue: project.economicParams?.baseNetValue ?? 0,
        // Fallbacks
        center: project.center || "0, 0",
        area: project.area ? `${project.area} km²` : "-",
        elevation: project.elevation || "-",
        lastSyncedAt: formatTime(project.updatedAt),
        baseGradeRange: "-", // Placeholder
        depthRange: "0-50m", // Placeholder
        aoi: project.aoi, // Pass GeoJSON
      };

      return transformedProject;
    },
    enabled: !!id,
  });
}

export function useProjectVoxels(id: string) {
  return useQuery({
    queryKey: ['project-voxels', id],
    queryFn: async () => {
      const { data } = await api.get<any[]>(`/projects/${id}/voxels`); // Type as any[] or Voxel[]
      return data;
    },
    enabled: !!id,
    staleTime: Infinity, // Voxels rarely change once generated
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 mins
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { name: string; pins: { lat: number; lng: number }[]; selectedDocuments?: string[] }) => {
      const { data } = await api.post('/projects', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data; // { id, filename, status }
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/projects/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}
