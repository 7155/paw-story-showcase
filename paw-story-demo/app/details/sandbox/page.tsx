import { SandboxLabDetail } from "./sandbox-lab";
import { labScenario } from "../../lab-evidence";

export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string | string[] }> }) {
  const scenario = labScenario((await searchParams).scenario);
  return <SandboxLabDetail key={scenario} initialScenario={scenario}/>;
}
