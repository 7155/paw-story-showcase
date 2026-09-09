export type ProjectPage = 'artifact' | 'materials' | 'runs' | 'brief' | 'apps' | 'knowledge' | 'journey';
export type ProjectView = { page: ProjectPage; guideOpen: boolean; artifactId?: string; bindingId?: string; knowledgePage?: 'sources' | 'index' | 'evaluation'; appId?: string; appVersion?: number; materialCorpusId?: string; materialSourceId?: string;
  journeyStep?: number; intakeTab?: 'files'|'baseline'; experimentId?:string; returnStep?:number; knowledgeJobId?:string; goldenJobId?:string; materialPage?:number; useBaseline?:boolean };
export const defaultProjectView: ProjectView = { page:'artifact', guideOpen:true };
export const journeyStages=['资料与基线','设定目标','基线评测','优化实验','结果对比','应用交付'] as const;
const stageKeys=['materials','goals','baseline','experiments','comparison','delivery'];
const validStage=(value:unknown):value is number=>Number.isInteger(value) && Number(value)>=0 && Number(value)<journeyStages.length;
export function projectViewRoute(projectId:string,view?:ProjectView):string {
  if(!projectId) return '/eval-lab';
  const q=new URLSearchParams({project:projectId});
  if(view) {
    q.set('projectPage',view.page);
    if(validStage(view.journeyStep)) q.set('step',stageKeys[view.journeyStep]);
    if(view.intakeTab && (view.journeyStep===0 || view.returnStep===0)) q.set('intake',view.intakeTab);
    if(validStage(view.returnStep) && view.page!=='journey') q.set('from',stageKeys[view.returnStep]);
    if(view.experimentId && (view.journeyStep===3 || view.returnStep===3)) q.set('record',view.experimentId);
    const keys:Partial<Record<keyof ProjectView,string>>=view.page==='materials' ? {materialCorpusId:'corpus',materialSourceId:'source',materialPage:'page'}
      :view.page==='apps' ? {appId:'appId',appVersion:'version'} : view.page==='knowledge' ? {knowledgePage:'knowledge',knowledgeJobId:'job',materialCorpusId:'corpus'}
      :view.page==='runs' ? {bindingId:'binding',goldenJobId:'job'} :view.page==='artifact' ? {artifactId:'artifact'} : {};
    for(const [key,param] of Object.entries(keys)) { const value=view[key as keyof ProjectView];if(value!==undefined && value!=='') q.set(param!,String(value)); }
    if(view.page==='knowledge' && view.useBaseline) q.set('basis','baseline');
  }
  return '/eval-lab?'+q;
}
export function projectViewFromSearch(search:string):Partial<ProjectView> {
  const q=new URLSearchParams(search),view:Partial<ProjectView>={};
  const page=q.get('projectPage');if(page && ['artifact','materials','runs','brief','apps','knowledge','journey'].includes(page)) view.page=page as ProjectPage;
  const step=stageKeys.indexOf(q.get('step') ?? ''),from=stageKeys.indexOf(q.get('from') ?? '');
  if(step>=0) view.journeyStep=step;if(from>=0) view.returnStep=from;
  const intake=q.get('intake');if(intake==='files'||intake==='baseline')view.intakeTab=intake;
  for(const [key,param] of [['experimentId','record'],['artifactId','artifact'],['bindingId','binding'],['appId','appId'],['materialCorpusId','corpus'],['materialSourceId','source']] as const) {const value=q.get(param);if(value && value.length<=1000)view[key]=value;}
  const knowledge=q.get('knowledge');if(['sources','index','evaluation'].includes(knowledge ?? ''))view.knowledgePage=knowledge as ProjectView['knowledgePage'];
  for(const [key,param] of [['appVersion','version'],['materialPage','page']] as const) {const value=Number(q.get(param));if(Number.isSafeInteger(value)&&value>0)view[key]=value;}
  const job=q.get('job');if(job && job.length<=240) {if(view.page==='knowledge')view.knowledgeJobId=job;if(view.page==='runs')view.goldenJobId=job;}
  if(q.get('basis')==='baseline') view.useBaseline=true;
  return view;
}
export function nextProjectView(current:ProjectView,patch:Partial<ProjectView>):ProjectView {
  const next={...current,...patch};
  if(patch.page && patch.page!=='journey' && patch.page!==current.page && patch.returnStep===undefined) next.returnStep=current.page==='journey' ? current.journeyStep ?? 0 : current.returnStep ?? current.journeyStep ?? 0;
  if(patch.page==='journey') { next.guideOpen=false;next.returnStep=undefined; }
  return next;
}
const key = (connection: string) => `paw.lab.project-views.v1:${connection}`;
export function readProjectViews(connection: string): Record<string, ProjectView> {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(key(connection)) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([,value]) => value && typeof value === 'object'
      && ['artifact','materials','runs','brief','apps','knowledge','journey'].includes(value.page) && typeof value.guideOpen === 'boolean'
      && (value.artifactId === undefined || typeof value.artifactId === 'string') && (value.bindingId === undefined || typeof value.bindingId === 'string')
      && (value.knowledgePage === undefined || ['sources','index','evaluation'].includes(value.knowledgePage))
      && (value.appId === undefined || typeof value.appId === 'string')
      && (value.materialCorpusId === undefined || typeof value.materialCorpusId === 'string')
      && (value.materialSourceId === undefined || typeof value.materialSourceId === 'string')
      && (value.journeyStep === undefined || validStage(value.journeyStep)) && (value.returnStep === undefined || validStage(value.returnStep))
      && (value.intakeTab === undefined || ['files','baseline'].includes(value.intakeTab))
      && ['experimentId','knowledgeJobId','goldenJobId'].every(key=>value[key]===undefined || typeof value[key]==='string')
      && (value.materialPage === undefined || Number.isSafeInteger(value.materialPage) && value.materialPage>0)
      && (value.appVersion === undefined || (Number.isSafeInteger(value.appVersion) && value.appVersion > 0))).slice(-100));
  } catch { return {}; }
}
export function writeProjectViews(connection: string, views: Record<string, ProjectView>): boolean {
  try { sessionStorage.setItem(key(connection), JSON.stringify(Object.fromEntries(Object.entries(views).slice(-100)))); return true; }
  catch { return false; }
}
