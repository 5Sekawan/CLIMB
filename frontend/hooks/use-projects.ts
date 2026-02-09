import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectDetail, ProjectSummary, DriftStatus, ProjectStatus } from '@/lib/mock-data';
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

// --- Mineral Color Palette ---
const MINERAL_COLORS: Record<string, string> = {
  Au: "bg-amber-400",
  Cu: "bg-orange-500",
  Ag: "bg-slate-400",
  Ni: "bg-teal-500",
  Co: "bg-blue-500",
  Fe: "bg-red-500",
  Mn: "bg-purple-500",
  Sn: "bg-gray-400",
  Mo: "bg-violet-500",
  Zn: "bg-zinc-400",
  Cr: "bg-emerald-600",
  Ta: "bg-indigo-500",
};

const MINERAL_LABELS: Record<string, string> = {
  Au: "Gold (Au)",
  Cu: "Copper (Cu)",
  Ag: "Silver (Ag)",
  Ni: "Nickel (Ni)",
  Co: "Cobalt (Co)",
  Fe: "Iron (Fe)",
  Mn: "Manganese (Mn)",
  Sn: "Tin (Sn)",
  Mo: "Molybdenum (Mo)",
  Zn: "Zinc (Zn)",
  Cr: "Chromium (Cr)",
  Ta: "Tantalum (Ta)",
};

const getMineralColor = (mineral: string): string => {
  return MINERAL_COLORS[mineral] || "bg-gray-400";
};

const getMineralLabel = (mineral: string): string => {
  return MINERAL_LABELS[mineral] || `${mineral} Mineral`;
};

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
            label: meta?.label || getMineralLabel(m),
            color: meta?.color || getMineralColor(m)
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
        pipelinePhase: project.pipelinePhase || 'idle',
        // Pass through cachedContext for advanced UI features
        cachedContext: project.cachedContext,
      };

      return transformedProject;
    },
    enabled: !!id,
    retry: 2,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
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

export function useStartInference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data } = await api.post(`/projects/${projectId}/inference/start`);
      return data;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useInferenceStatus(projectId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['project-status', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; status: string; lastInferenceAt?: string; pipelinePhase?: string }>(`/projects/${projectId}/status`);
      return data;
    },
    enabled: enabled && !!projectId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing') return 2000;
      // If just completed, invalidate the project detail to fetch fresh data
      return false;
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
