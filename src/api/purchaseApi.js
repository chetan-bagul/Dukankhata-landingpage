import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';
export const getPurchases=()=>api.get('/purchases');
export const getPurchase=id=>api.get(`/purchases/${id}`);
export const createPurchase=(data,key=newIdempotencyKey())=>api.post('/purchases',data,idempotencyConfig(key));
