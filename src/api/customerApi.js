import api from './axiosClient';
import { newIdempotencyKey, idempotencyConfig } from './idempotency';

const extractData = (r) => {
  if (r && r.data !== undefined) {
    if (r.data && r.data.data !== undefined) {
      return r.data.data;
    }
    return r.data;
  }
  return r;
};

export const listCustomers = () =>
  api.get('/customers').then(extractData);

export const createCustomer = (payload) =>
  api.post('/customers', payload).then(extractData);

export const updateCustomer = (id, payload) =>
  api.put(`/customers/${id}`, payload).then(extractData);

export const deactivateCustomer = (id) =>
  api.delete(`/customers/${id}`).then(extractData);

export const getLedger = (id) =>
  api.get(`/customers/${id}/ledger`)
    .catch((err) => {
      if (err.response?.status === 404) {
        return api.get(`/customers/${id}/transactions`);
      }
      throw err;
    })
    .then(extractData);

export const addCharge = async (id, payload, key = newIdempotencyKey()) => {
  const config = idempotencyConfig(key);
  try {
    const res = await api.post(`/customers/${id}/ledger/charge`, payload, config);
    return extractData(res);
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        const res2 = await api.post(`/customers/${id}/charge`, payload, config);
        return extractData(res2);
      } catch (err2) {
        if (err2.response?.status === 404) {
          try {
            const res3 = await api.post(`/customers/${id}/debit`, payload, config);
            return extractData(res3);
          } catch (err3) {
            if (err3.response?.status === 404) {
              const res4 = await api.post(`/customers/${id}/ledger`, { ...payload, type: "CHARGE" }, config);
              return extractData(res4);
            }
            throw err3;
          }
        }
        throw err2;
      }
    }
    throw err;
  }
};

export const addPayment = async (id, payload, key = newIdempotencyKey()) => {
  const config = idempotencyConfig(key);
  try {
    const res = await api.post(`/customers/${id}/ledger/payment`, payload, config);
    return extractData(res);
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        const res2 = await api.post(`/customers/${id}/payment`, payload, config);
        return extractData(res2);
      } catch (err2) {
        if (err2.response?.status === 404) {
          try {
            const res3 = await api.post(`/customers/${id}/credit`, payload, config);
            return extractData(res3);
          } catch (err3) {
            if (err3.response?.status === 404) {
              const res4 = await api.post(`/customers/${id}/ledger`, { ...payload, type: payload.type || "PAYMENT" }, config);
              return extractData(res4);
            }
            throw err3;
          }
        }
        throw err2;
      }
    }
    throw err;
  }
};

