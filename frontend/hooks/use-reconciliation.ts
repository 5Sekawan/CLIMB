import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUploadActuals() {
  return useMutation({
    mutationFn: async ({ file, projectId }: { file: File; projectId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      const { data } = await api.post('/reconciliation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  });
}

export function useInjectFeedback() {
  return useMutation({
    mutationFn: async (payload: { projectId: string; lesson: string; location: { lat: number; lon: number } }) => {
      const { data } = await api.post('/reconciliation/inject-feedback', payload);
      return data;
    },
  });
}
