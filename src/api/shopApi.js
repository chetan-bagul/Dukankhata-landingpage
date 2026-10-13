import api from './axiosClient';
export const getShopSettings=()=>api.get('/shop/settings');
export const updateShopSettings=data=>api.put('/shop/settings',data);
