import apiRequest from '../../services/api';

const paymentService = {
  getAll: async () => {
    return apiRequest('/payments');
  },

  getById: async (id) => {
    return apiRequest(`/payments/${id}`);
  },

  create: async (paymentData) => {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  update: async (id, paymentData) => {
    return apiRequest(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/payments/${id}`, { method: 'DELETE' });
  },
};

export default paymentService;