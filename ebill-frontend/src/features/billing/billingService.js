import apiRequest from '../../services/api';

const billingService = {
  getAll: async () => {
    return apiRequest('/billing');
  },

  getById: async (id) => {
    return apiRequest(`/billing/${id}`);
  },

  create: async (billingData) => {
    return apiRequest('/billing', {
      method: 'POST',
      body: JSON.stringify(billingData),
    });
  },

  update: async (id, billingData) => {
    return apiRequest(`/billing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(billingData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/billing/${id}`, { method: 'DELETE' });
  },
};

export default billingService;