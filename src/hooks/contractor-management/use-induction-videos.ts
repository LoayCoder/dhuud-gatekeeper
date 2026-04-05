import { useQuery } from '@tanstack/react-query';

export interface InductionVideo {
  id: string;
  title: string;
  url: string;
  [key: string]: unknown;
}

export function useInductionVideos() {
  return useQuery({
    queryKey: ['induction-videos'],
    queryFn: async () => [] as InductionVideo[],
  });
}
