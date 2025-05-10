import apiRequest from '../../services/api';

const customerService = {
  getAll: async () => {
    return apiRequest('/customers');
  },

  getById: async (id) => {
    return apiRequest(`/customers/${id}`);
  },

  create: async (customerData) => {
    return apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  update: async (id, customerData) => {
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/customers/${id}`, { method: 'DELETE' });
  },
};

export default customerService;