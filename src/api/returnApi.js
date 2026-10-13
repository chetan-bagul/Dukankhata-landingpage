import axiosClient from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const returnSale = (saleId, payload, key=newIdempotencyKey()) => axiosClient.post(`/returns/sales/${saleId}`, payload, idempotencyConfig(key));
export const listReturns = () => axiosClient.get('/returns');
