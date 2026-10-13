import client from './axiosClient';
export async function getAuditEvents(limit=100){const r=await client.get(`/audit?limit=${limit}`);return r.data.data;}
