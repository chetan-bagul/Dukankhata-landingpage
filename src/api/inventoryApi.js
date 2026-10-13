import api from './axiosClient';
export const receiveStock=(id,data)=>api.post(`/inventory/${id}/receive`,data);
export const adjustStock=(id,data)=>api.post(`/inventory/${id}/adjust`,data);
export const getLowStock=()=>api.get('/inventory/low-stock');
export const getStockHistory=id=>api.get(`/inventory/${id}/history`);
