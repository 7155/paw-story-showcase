import {cpSync,mkdirSync,rmSync,existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {zip} from './archive-real-app.mjs';
const root=fileURLToPath(new URL('../../real-apps/',import.meta.url));
const out=fileURLToPath(new URL('../public/real-apps/',import.meta.url));
rmSync(out,{recursive:true,force:true});
if(process.argv.includes('--clean')) process.exit(0);
if(!existsSync(root+'/geo/dist/index.html')) throw new Error('Build real-apps/geo before materializing real app frontends.');
mkdirSync(out,{recursive:true});
cpSync(root+'/enterprise-rag',out+'/enterprise-rag',{recursive:true});
cpSync(root+'/geo/dist',out+'/geo',{recursive:true});
for(const key of ['support','wix']) cpSync(root+'/'+key,out+'/'+key,{recursive:true});
cpSync(root+'/assistant-snapshot.js',out+'/assistant-snapshot.js');
cpSync(root+'/replay-guide.js',out+'/replay-guide.js');

for(const key of ['support','wix','enterprise-rag','geo']) {
 const files={};
 const walk=(path,prefix)=>{for(const entry of readdirSync(path,{withFileTypes:true})) {if(['node_modules','dist'].includes(entry.name))continue; const target=prefix+'/'+entry.name;if(entry.isDirectory())walk(path+'/'+entry.name,target);else files[target]=readFileSync(path+'/'+entry.name);}};
 walk(out+'/'+key,'real-apps/'+key);
 if(key==='geo')walk(root+'/geo','source/geo');
 for(const helper of ['assistant-snapshot.js','replay-guide.js'])files['real-apps/'+helper]=readFileSync(out+'/'+helper);
 files['LICENSE']=readFileSync(root+'/PAW-LICENSE');
 files['README.md']=`# Original ${key} historical app\n\nRun node server.mjs, then open http://localhost:8080/real-apps/${key}/index.html . This package displays original saved results. It does not run a Provider or Earth Engine. Source and provenance are included.\n`;
 files['server.mjs']=`import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {fileURLToPath} from 'node:url';const root=fileURLToPath(new URL('.',import.meta.url));const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.csv':'text/csv','.tif':'image/tiff'};createServer(async(req,res)=>{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end('Not found');}}).listen(8080,'127.0.0.1',()=>console.log('Open http://localhost:8080/real-apps/${key}/index.html'));`;
 writeFileSync(out+'/'+key+'-historical-app.zip',zip(files));
}
