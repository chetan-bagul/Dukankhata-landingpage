import axiosClient from './axiosClient';
export const getFinancialSummary=(from,to)=>axiosClient.get('/finance/summary',{params:{from,to}});
export const getExpenses=(from,to)=>axiosClient.get('/finance/expenses',{params:{from,to}});
export const addExpense=(payload)=>axiosClient.post('/finance/expenses',payload);
export const deleteExpense=(id)=>axiosClient.delete(`/finance/expenses/${id}`);
