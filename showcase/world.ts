import source from './world.v2.json';
export const world = source;
export type ShowcaseWorld = typeof source;
export type WorldScenario = keyof ShowcaseWorld['datasets'];
export const worldScenarioKeys: WorldScenario[] = ['enterpriseops','rag','cloudops','memory'];
export const worldAgentParticipantIds: Record<string,string> = {
 'agent-lead':'participant-facilitator','agent-input':'participant-input','agent-memory':'participant-runtime',
 'agent-coordination':'participant-context','agent-os':'participant-room','agent-reviewer':'participant-review',
};
export function validateWorld(value: ShowcaseWorld = world) {
 const errors:string[]=[];
 const ids=Object.fromEntries(['agents','tasks','messages','toolCalls','artifacts'].map(key=>{
  const rows=value[key as 'agents'] as {id:string}[];const found=new Set(rows.map(row=>row.id));
  if(found.size!==rows.length)errors.push(`${key}: duplicate id`);return [key,found];
 }));
 const scalarRefs={taskId:'tasks',ownerId:'agents',authorId:'agents',fromAgentId:'agents',toAgentId:'agents'};
 const listRefs={dependsOn:'tasks',inputArtifactIds:'artifacts',outputArtifactIds:'artifacts',artifactIds:'artifacts',toolCallIds:'toolCalls'};
 for(const kind of ['tasks','messages','toolCalls','artifacts','traceRuns'] as const)for(const item of value[kind]) {
  const row=item as unknown as Record<string,unknown>;
  for(const [key,target]of Object.entries(scalarRefs))if(row[key]&&row[key]!=='user'&&!ids[target].has(String(row[key])))errors.push(`${item.id}: unknown ${key} ${row[key]}`);
  for(const [key,target]of Object.entries(listRefs))for(const id of (row[key] as string[]||[]))if(!ids[target].has(id))errors.push(`${item.id}: unknown ${key} ${id}`);
 }
 const visiting=new Set<string>(),done=new Set<string>();
 function visit(id:string){if(visiting.has(id)){errors.push(`task dependency cycle: ${id}`);return;}if(done.has(id))return;visiting.add(id);for(const dep of value.tasks.find(t=>t.id===id)?.dependsOn||[])visit(dep);visiting.delete(id);done.add(id);}
 value.tasks.forEach(t=>visit(t.id));
 return {valid:errors.length===0,errors,counts:{agents:value.agents.length,tasks:value.tasks.length,messages:value.messages.length,toolCalls:value.toolCalls.length,artifacts:value.artifacts.length,cases:worldScenarioKeys.reduce((sum,key)=>sum+value.datasets[key].cases.length,0)}};
}

export const worldMemoryStats = {
 sampleCount: world.datasets.memory.sources.length,
 committedCount: world.datasets.memory.sources.filter(source=>source.phase==='committed').length,
 excludedPhaseCount: world.datasets.memory.sources.filter(source=>source.phase!=='committed').length,
 projectCount: new Set(world.datasets.memory.sources.map(source=>source.projectId)).size,
};
