import client from './axiosClient';
export async function getNotifications(){const r=await client.get('/notifications');return r.data.data;}
export async function sendNotification(payload){const r=await client.post('/notifications',payload);return r.data.data;}
export async function retryNotification(id){const r=await client.post(`/notifications/${id}/retry`);return r.data.data;}
