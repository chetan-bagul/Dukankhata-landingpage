import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const getSuppliers=()=>api.get('/suppliers');
export const createSupplier=data=>api.post('/suppliers',data);
export const updateSupplier=(id,data)=>api.put(`/suppliers/${id}`,data);
export const getSupplierLedger=id=>api.get(`/suppliers/${id}/ledger`);
export const paySupplier=(id,data,key=newIdempotencyKey())=>api.post(`/suppliers/${id}/payments`,data,idempotencyConfig(key));
