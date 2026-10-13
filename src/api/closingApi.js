import api from "./axiosClient";
export const getClosings = () => api.get("/closings");
export const getClosing = (id) => api.get(`/closings/${id}`);
export const saveClosing = (p) => api.post("/closings", p);
export const closeClosing = (id) => api.post(`/closings/${id}/close`);
export const reopenClosing = (id) => api.post(`/closings/${id}/reopen`);
export const syncPosToClosing = (id) => api.post(`/closings/${id}/sync-pos`);
