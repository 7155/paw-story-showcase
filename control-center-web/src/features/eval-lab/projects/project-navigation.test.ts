import { describe, expect, it } from 'vitest';
import { nextProjectView, projectViewFromSearch, projectViewRoute, type ProjectView } from './views';
describe('project navigation',()=>{
  it('retains the experiment origin and exact App version through a detail round trip',()=>{
    const origin:ProjectView={page:'journey',guideOpen:false,journeyStep:3,experimentId:'trial:42'};
    const target=nextProjectView(origin,{page:'apps',appId:'research:full',appVersion:8});
    expect(target.returnStep).toBe(3);
    const read=projectViewFromSearch(projectViewRoute('211 papers',target).split('?')[1]);
    expect(read).toMatchObject({page:'apps',returnStep:3,journeyStep:3,experimentId:'trial:42',appId:'research:full',appVersion:8});
    expect(nextProjectView(target,{page:'journey',journeyStep:target.returnStep})).toMatchObject(origin);
  });
  it('keeps the exact source and page, including special characters, on refresh',()=>{
    const view:ProjectView={page:'materials',guideOpen:false,journeyStep:0,intakeTab:'files',returnStep:0,materialCorpusId:'corpus:one',materialSourceId:'knowledge:冰架 A&B.pdf',materialPage:3};
    const {guideOpen:_guide,...navigation}=view;
    expect(projectViewFromSearch(projectViewRoute('project',view).split('?')[1])).toMatchObject(navigation);
  });
  it('keeps a selected experiment or saved baseline explicit in evaluation navigation',()=>{
    const view:ProjectView={page:'knowledge',guideOpen:false,journeyStep:2,returnStep:2,knowledgePage:'evaluation',knowledgeJobId:'trial:old',useBaseline:true};
    expect(projectViewFromSearch(projectViewRoute('project',view).split('?')[1])).toMatchObject({knowledgeJobId:'trial:old',knowledgePage:'evaluation',useBaseline:true});
    expect(projectViewFromSearch('?projectPage=bad&step=unknown&version=-1&intake=invalid')).toEqual({});
  });
});
