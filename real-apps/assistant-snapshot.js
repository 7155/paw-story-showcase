// App-authored UI renders the original saved result through its original history API.
const historyRecords=fetch('./history.json').then(r=>r.json());
window.pawApp=Object.freeze({mode:'standalone',capabilities:Object.freeze({progress:false,cancel:false}),history:()=>historyRecords,invoke:async()=>{throw Object.assign(new Error('当前展示已保存的历史调用。请点击「查看最近咨询」或「历史记录」恢复原结果；新的模型请求需要在本地 App 中运行。'),{state:'rejected'});}});
