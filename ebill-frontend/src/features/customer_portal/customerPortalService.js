import apiRequest from '../../services/api';

const customerPortalService = {
  getUnpaidBills: async (identifier) => {
    // You'll need to ensure your backend has an endpoint like this.
    // It should search for a customer by email or phone and return their unpaid bills.
    // The query parameter `identifier` will hold the email or phone number.
    return apiRequest(`/public/customer-bills?identifier=${encodeURIComponent(identifier)}`);
  },
  processBillPayment: async (billId, paymentMethod) => {
    return apiRequest(`/public/bills/${billId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod }),
      // No need for withoutApiPrefix here if apiRequest handles /public correctly
      // or ensure api.js is flexible. For now, assuming /public is handled.
    }, { withoutApiPrefix: true }); // Ensure this path doesn't get /api prepended
  }
};

export default customerPortalService;