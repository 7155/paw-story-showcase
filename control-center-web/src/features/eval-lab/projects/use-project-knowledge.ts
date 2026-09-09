import { useQuery } from '@tanstack/react-query';
import { useControlTransport } from '@/app/control-transport';
import { labConnectionKey } from '../control-request';
import { readLabProject } from './api';
import { activeKnowledgeJob, parseKnowledgeState } from './knowledge-types';

export function useProjectKnowledge(projectId: string) {
  const transport = useControlTransport();
  return useQuery({
    queryKey: ['lab-knowledge', labConnectionKey(transport), projectId],
    queryFn: async ({ signal }) => parseKnowledgeState((await readLabProject(transport, projectId, '', undefined, signal)).knowledge),
    retry: false, refetchOnWindowFocus: true,
    refetchInterval: query => query.state.status === 'error' || query.state.data?.jobs.some(activeKnowledgeJob) ? 1500 : false,
  });
}
