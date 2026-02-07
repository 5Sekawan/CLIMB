import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ActivityLog {
  _id: string;
  type: 'inference' | 'production' | 'reconciliation' | 'system';
  message: string;
  projectId?: string;
  projectName?: string;
  timestamp: string;
}

export function useActivity(limit: number = 20) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ActivityLog[] }>(`/activity?limit=${limit}`);
      return data.data;
    },
    refetchInterval: 10000, // Poll every 10s for live updates
  });
}
