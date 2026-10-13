import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const createSale = (payload, key = newIdempotencyKey()) => api.post('/pos/sales', payload, idempotencyConfig(key)).then(r=>r.data);
export const downloadInvoice = async (id) => { const r=await api.get(`/invoices/${id}/pdf`,{responseType:'blob'}); const url=URL.createObjectURL(r.data); const a=document.createElement('a'); a.href=url; a.download='invoice.pdf'; a.click(); URL.revokeObjectURL(url); };

/**
 * Reads pagination headers (X-Page, X-Page-Size, X-Has-More) from Axios or Fetch headers.
 */
export function parsePaginationHeaders(headers) {
  if (!headers) return { page: 0, pageSize: 25, hasMore: false };
  const get = (key) => {
    if (typeof headers.get === 'function') {
      return headers.get(key) || headers.get(key.toLowerCase());
    }
    return headers[key.toLowerCase()] ?? headers[key] ?? null;
  };

  const hasMoreVal = get('x-has-more');
  const pageVal = get('x-page');
  const sizeVal = get('x-page-size');

  return {
    page: pageVal !== null && !isNaN(Number(pageVal)) ? Number(pageVal) : 0,
    pageSize: sizeVal !== null && !isNaN(Number(sizeVal)) ? Number(sizeVal) : 25,
    hasMore: String(hasMoreVal).toLowerCase() === 'true',
  };
}

export const getSales = (page = 0, size = 25) =>
  api.get('/pos/sales', { params: { page, size } });
export const posGetSale = (id) => api.get(`/pos/sales/${id}`);
