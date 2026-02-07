'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <QueryClientProvider client={queryClient}>
      {apiKey ? (
        <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
          {children}
        </APIProvider>
      ) : (
        // Fallback for when API key is missing (dev mode)
        // The Map component will need to handle the missing context gracefully or show a placeholder
        <>{children}</>
      )}
    </QueryClientProvider>
  );
}
