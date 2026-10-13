import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const createSale = (payload, key = newIdempotencyKey()) => api.post('/pos/sales', payload, idempotencyConfig(key)).then(r=>r.data);
export const downloadInvoice = async (id) => { const r=await api.get(`/invoices/${id}/pdf`,{responseType:'blob'}); const url=URL.createObjectURL(r.data); const a=document.createElement('a'); a.href=url; a.download='invoice.pdf'; a.click(); URL.revokeObjectURL(url); };

export const getSales = () => api.get('/pos/sales');
export const posGetSale = (id) => api.get(`/pos/sales/${id}`);
