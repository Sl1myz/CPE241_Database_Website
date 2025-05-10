import apiRequest from '../../services/api';

const meterService = {
  getAll: async () => {
    return apiRequest('/meters');
  },

  getById: async (id) => {
    return apiRequest(`/meters/${id}`);
  },

  create: async (meterData) => {
    return apiRequest('/meters', {
      method: 'POST',
      body: JSON.stringify(meterData),
    });
  },

  update: async (id, meterData) => {
    return apiRequest(`/meters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meterData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/meters/${id}`, { method: 'DELETE' });
  },
};

export default meterService;