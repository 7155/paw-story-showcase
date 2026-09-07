// Public read adapter for the unchanged viewer API contract. No model invocation.
const snapshot = fetch('./snapshot.json').then(r => r.json());
window.publicSnapshotFetch = async function(path) {
 const s = await snapshot, u = new URL(path, location.href), p = u.pathname, q = u.searchParams;
 let body;
 if(['/api/overview','/api/results','/api/heldout'].includes(p)) body=s[p.slice(5)];
 else if(p.startsWith('/api/documents/')) {
  const d=s.documents.find(d=>d.documentId===decodeURIComponent(p.slice(15)));
  if(d) return fetch('./documents/'+d.file);
 } else if(p.startsWith('/api/queries/')) body=s.queries.find(d=>d.queryId===decodeURIComponent(p.slice(13)));
 else if(p==='/api/documents'||p==='/api/queries') {
  const docs=p==='/api/documents', search=(q.get('q')||'').trim().toLowerCase();
  const split=q.get('split')||'train',kind=q.get('kind')||'retrieval';
  const group=docs?s.documents:s.queries.filter(d=>d.split===split&&d.kind===kind);
  const rows=group.filter(d=>docs?(!q.get('source')||d.source===q.get('source'))&&(!search||d.title.toLowerCase().includes(search)||d.source.toLowerCase().includes(search)):(!q.get('slice')||d.slice===q.get('slice'))&&(!search||d.query.toLowerCase().includes(search)));
  const offset=Math.max(0,Number(q.get('offset'))||0),limit=Math.max(1,Math.min(200,Number(q.get('limit'))||(docs?30:40)));
  body={total:rows.length,offset,limit,items:rows.slice(offset,offset+limit),...(docs?{sources:[...new Set(s.documents.map(d=>d.source))].sort()}:{split,kind,slices:[...new Set(group.map(d=>d.slice))].sort()})};
 }
 return new Response(JSON.stringify(body||{error:'Snapshot endpoint not found'}),{status:body?200:404,headers:{'Content-Type':'application/json'}});
};
