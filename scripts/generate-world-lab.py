#!/usr/bin/env python3
"""Rebuild the scalar Lab import fixture from public world.v2.json; gold stays in cases."""
import json
from pathlib import Path
w=json.loads(Path('showcase/world.v2.json').read_text()); out={}
s=lambda x:json.dumps(x,ensure_ascii=False)
e=w['datasets']['enterpriseops']; owners=e['owners']
rows=[]
for c in e['customers']:
 rows.append(dict(id=c['id'],worldKind='enterpriseops',customer=c['name'],title=c['name'],region=c['region'],role=e['operator']['role'],tenureDays=e['operator']['tenureDays'],currentOwner=next(o['name'] for o in owners if o['id']==c['currentOwnerId']),candidateOwner='按约束选择',text=c['handoverNote'],sourceTitle='客户交接材料与在途工单',sourceId=c['id'],revision=c['revision'],locked=int(c['locked']),sector=c['sector'],requiredCertifications=s(c['requiredCertifications']),owners=s(owners),nextFollowUp=c['nextFollowUp'],tickets=s([t for t in e['tickets'] if t['customerId']==c['id']]),context=c['accountSummary']))
out['enterpriseops']={'records':rows,'cases':[dict(id=c['id'],input=c['customerId'],expected='允许' if c['expectedAction']=='propose' else '拒绝') for c in e['cases']]}
r=w['datasets']['rag'];out['rag']={'records':[dict(id=d['id'],worldKind='rag',title=d['title'],text=d['text'],keywords=d['keywords'],scope=d['scope'],version=d['version'],status=d['status'],effectiveAt=d['effectiveAt'],authority=d['authority'],access=d['access'],sourceTitle=d['path'],sourceId=d['id'],sections=s(d['sections'])) for d in r['documents']], 'cases':[dict(id=c['id'],input=s({'query':c['input'],'scope':c['scope'],'asOf':r['asOf']}),expected='|'.join(c['relevantDocIds']) or '未命中') for c in r['cases']]}
c=w['datasets']['cloudops'];out['cloudops']={'records':[dict(id=i['id'],worldKind='cloudops',title=i['title'],text=i['summary']+'\n\n'+i['impact']+'\n\n'+i['readOnlyNext'],severity=i['priority'],cluster=i['scope'],latencyMs=950,errorRate=.12,dbUtilization=.7,visibleSignal=i['visibleSignal'],configDiff=i['configDiff'],timeline='\n'.join(f"{t['time']} [{t['service']}] {t['text']}" for t in i['timeline']),logs=s(i['logs']),alerts=s(i['alerts']),sourceId=i['id'],sourceTitle='只读观测与配置差异') for i in c['incidents']],'cases':[dict(id=c['id'],input=c['incidentId'],expected=c['expectedService']) for c in c['cases']]}
m=w['datasets']['memory'];out['memory']={'records':[dict(id=x['id'],worldKind='memory',title=x['text'][:28],text=x['text'],scope=x['retention'],projectScope=x['scope'],projectId=x['projectId'],phase=x['phase'],consent=int(x['consent']),intent=x['intent'],concept=x['concept'],corrects=x['corrects'] or '',revokes=x['revokes'] or '',time=x['time'],application=x['application'],sourceId=x['id'],sourceTitle=x['application']+' · '+x['time'],topicTitle=next((t['title'] for t in m['topics'] if x['concept'] in t['concepts']),'项目规则')) for x in m['sources']],'cases':[dict(id=c['id'],input=c['sourceId'],expected={'keep':'保留','merge':'合并','correct':'纠正','revoke':'撤销','exclude':'不保留'}[c['expectedAction']]) for c in m['cases']]}
serialized=json.dumps(out,ensure_ascii=False,indent=2)+'\n'
output=Path('showcase/datasets/lab-world.v2.json')
import sys
if '--check' in sys.argv:
 assert output.read_text()==serialized, 'Run python3 scripts/generate-world-lab.py to refresh the public fixture.'
 print('World Lab fixture is current: 154 cases across four scenarios.')
else:
 output.write_text(serialized)
