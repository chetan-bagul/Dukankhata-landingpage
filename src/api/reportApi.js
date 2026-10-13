import api from "./axiosClient";
export async function getReport(from,to){ const r=await api.get("/reports/summary",{params:{from,to}}); return r.data?.data ?? r.data; }
export async function downloadReport(from,to){ const r=await api.get("/reports/pdf",{params:{from,to},responseType:"blob"}); const url=URL.createObjectURL(r.data); const a=document.createElement("a"); a.href=url; a.download=`dukankhata-report-${from}-to-${to}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
