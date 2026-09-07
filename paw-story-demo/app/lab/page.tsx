import { labScenario } from '../lab-evidence';
import { LabShowcase } from './lab-showcase';

export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string | string[] }> }) {
  return <LabShowcase scenario={labScenario((await searchParams).scenario)}/>;
}
