// Read-only projection of the v11 completed workspace. Original UI remains in charge.
const base = '/real-apps/geo/';
const snapshot = fetch(base + 'snapshot.json').then(r => r.json()) as Promise<Record<string, unknown>>;
export async function publicSnapshotFetch(path: string, init?: RequestInit): Promise<Response> {
 if (init?.method && init.method !== 'GET') return new Response(JSON.stringify({error:{message:'公开历史回放不执行新的云端任务。请在本地地理研判台运行。'}}),{status:409});
 const u=new URL(path,location.href), artifact=u.pathname.match(/^\/api\/jobs\/([^/]+)\/artifacts\/([^/]+)$/);
 if(artifact) return fetch(`${base}seed/jobs/${artifact[1]}/${artifact[2]}`);
 const data=(await snapshot)[u.pathname];
 return new Response(JSON.stringify(data??{error:{message:'此记录未包含在公开历史结果中'}}),{status:data===undefined?404:200,headers:{'Content-Type':'application/json'}});
}
