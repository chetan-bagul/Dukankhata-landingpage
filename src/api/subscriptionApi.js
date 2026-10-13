import api from "./axiosClient";
export async function getPlans(){return (await api.get("/subscription/plans")).data;}
export async function getCurrentSubscription(){return (await api.get("/subscription/current")).data;}
export async function createSubscriptionOrder(planCode){return (await api.post("/subscription/orders",{planCode})).data;}
export async function verifySubscriptionPayment(payload){return (await api.post("/subscription/verify",payload)).data;}
