import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectDetail, ProjectSummary } from '@/lib/mock-data';

// --- Types (Temporary, mirroring backend response) ---
export interface ProjectResponse {
  data: ProjectSummary[];
  meta: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

// --- Hooks ---

export function useProjects(params?: { page?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get<ProjectResponse>('/projects', { params });
      return data;
    },
  });
}

export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ProjectDetail }>(`/projects/${id}`);
      return data.data;
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
