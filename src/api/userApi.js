import api from './axiosClient';
export const listUsers=()=>api.get('/users');
export const createStaffUser=(payload)=>api.post('/users/staff',payload);
export const setUserActive=(id,value)=>api.patch(`/users/${id}/active`,null,{params:{value}});
