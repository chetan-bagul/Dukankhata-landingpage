import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const listStaff=()=>api.get('/staff');
export const createStaff=(payload)=>api.post('/staff',payload);
export const updateStaff=(id,payload)=>api.put(`/staff/${id}`,payload);
export const deactivateStaff=(id)=>api.delete(`/staff/${id}`);
export const getStaffLedger=(id)=>api.get(`/staff/${id}/ledger`);
export const payoutStaff=(id,payload,key=newIdempotencyKey())=>api.post(`/staff/${id}/payouts`,payload,idempotencyConfig(key));
export const adjustStaff=(id,payload)=>api.post(`/staff/${id}/adjustments`,payload);
