import { VerticalApps } from './vertical-apps';
import type { AppKey } from './vertical-apps';
export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const { scenario } = await searchParams;
  return <VerticalApps initialScenario={(['rag', 'support', 'wix', 'enterprise-rag', 'geo'].includes(scenario || '') ? scenario : 'rag') as AppKey}/>;
}
