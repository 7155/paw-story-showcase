import { VerticalApps } from './vertical-apps';
import type { LabKey } from '../../../showcase/lab-evidence';
export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const { scenario } = await searchParams;
  return <VerticalApps initialScenario={(['rag', 'cloudops', 'enterpriseops', 'memory'].includes(scenario || '') ? scenario : 'rag') as LabKey}/>;
}
