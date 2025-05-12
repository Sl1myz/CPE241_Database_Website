import React, { useState, useEffect } from 'react';

function PaymentForm({ isOpen, onClose, onSubmit, initialData, isEditMode }) {
  const [formData, setFormData] = useState({
    Payment_ID: '',
    Bill_ID: '',
    Processed_By: '', // New field
    Payment_Date: '',
    Amount_Paid: '',
    Payment_Method: 'Credit Card', // Default method
    Payment_Status: 'Completed',   // New field with a default
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        Payment_ID: initialData.Payment_ID ? String(initialData.Payment_ID) : '',
        Bill_ID: initialData.Bill_ID ? String(initialData.Bill_ID) : '',
        Processed_By: initialData.Processed_By ? String(initialData.Processed_By) : '',
        Amount_Paid: initialData.Amount_Paid ? String(initialData.Amount_Paid) : '',
        Payment_Date: initialData.Payment_Date ? new Date(initialData.Payment_Date).toISOString().split('T')[0] : '',
        Payment_Status: initialData.Payment_Status || 'Completed', // Ensure it has a value
      });
    } else {
      // For new payments, set Payment_Date to today
      setFormData({
        Payment_ID: '', Bill_ID: '', Processed_By: '',
        Payment_Date: new Date().toISOString().split('T')[0], // Default to today
        Amount_Paid: '', Payment_Method: 'Credit Card', Payment_Status: 'Completed',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.Bill_ID) { setError('Bill ID is required.'); return; }
    if (!formData.Payment_Date) { setError('Payment Date is required.'); return; }
    // Processed_By might be optional or handled by backend if not provided (e.g. current logged in user)
    // if (!formData.Processed_By) { setError('Processed By (User ID) is required.'); return; }
    if (!formData.Amount_Paid) { setError('Amount Paid is required.'); return; }
    if (!formData.Payment_Status) { setError('Payment Status is required.'); return; }

    try {
      const payload = {
        ...formData,
        Bill_ID: parseInt(formData.Bill_ID, 10),
        Processed_By: formData.Processed_By ? parseInt(formData.Processed_By, 10) : null, // Send null if empty, assuming backend handles nullable int
        Amount_Paid: parseFloat(formData.Amount_Paid),
      };
      if (isEditMode) {
        payload.Payment_ID = parseInt(formData.Payment_ID, 10);
      } else {
        if (!formData.Payment_ID || String(formData.Payment_ID).trim() === '') {
          delete payload.Payment_ID;
        } else {
          payload.Payment_ID = parseInt(formData.Payment_ID, 10);
        }
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditMode ? 'Edit Payment' : 'Record Payment'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form-container">
          <div>
            <label>Payment ID:</label>
            <input
              type="number"
              name="Payment_ID"
              value={formData.Payment_ID}
              onChange={handleChange}
              disabled={isEditMode} />
          </div>
          <div>
            <label>Bill ID:</label>
            <input type="number" name="Bill_ID" value={formData.Bill_ID} onChange={handleChange} required />
          </div>
          <div>
            <label>Processed By (User ID):</label>
            <input type="number" name="Processed_By" value={formData.Processed_By} onChange={handleChange} />
          </div>
          <div>
            <label>Payment Date:</label>
            <input type="date" name="Payment_Date" value={formData.Payment_Date} onChange={handleChange} required />
          </div>
          <div>
            <label>Amount Paid:</label>
            <input type="number" step="0.01" name="Amount_Paid" value={formData.Amount_Paid} onChange={handleChange} required />
          </div>
          <div>
            <label>Payment Method:</label>
            <select name="Payment_Method" value={formData.Payment_Method} onChange={handleChange}>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Mobile Payment">Mobile Payment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label>Payment Status:</label>
            <select name="Payment_Status" value={formData.Payment_Status} onChange={handleChange} required>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
            <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Record Payment'}</button>
            <button type="button" onClick={onClose} className="btn btn-light">Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default PaymentForm;
