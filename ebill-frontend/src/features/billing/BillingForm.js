import React, { useState, useEffect } from 'react';

function BillingForm({ isOpen, onClose, onSubmit, initialData, isEditMode }) {
  const [formData, setFormData] = useState({
    Bill_ID: '',
    Customer_ID: '',
    Meter_ID: '',
    Billing_Date: '',
    ReadingPrevious: '',
    ReadingCurrent: '',
    Rate_Applied: '',
    Amount_Due: '',
    Due_Date: '',
    Paid_Status: false, 
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        Bill_ID: initialData.Bill_ID ? String(initialData.Bill_ID) : '',
        Customer_ID: initialData.Customer_ID ? String(initialData.Customer_ID) : '',
        Meter_ID: initialData.Meter_ID ? String(initialData.Meter_ID) : '',
        ReadingPrevious: initialData.ReadingPrevious ? String(initialData.ReadingPrevious) : '',
        ReadingCurrent: initialData.ReadingCurrent ? String(initialData.ReadingCurrent) : '',
        Rate_Applied: initialData.Rate_Applied ? String(initialData.Rate_Applied) : '',
        // Total_Unit will be populated from initialData if present, but not directly editable for submission
        Amount_Due: initialData.Amount_Due ? String(initialData.Amount_Due) : '',
        Billing_Date: initialData.Billing_Date ? new Date(initialData.Billing_Date).toISOString().split('T')[0] : '',
        Due_Date: initialData.Due_Date ? new Date(initialData.Due_Date).toISOString().split('T')[0] : '',
        // Paid_Status is already boolean
      });
    } else {
      // For new bills, set Billing_Date to today
      setFormData({
        Bill_ID: '', Customer_ID: '', Meter_ID: '', 
        Billing_Date: new Date().toISOString().split('T')[0], // Default to today
        ReadingPrevious: '', ReadingCurrent: '', Rate_Applied: '',
        Amount_Due: '', Due_Date: '', Paid_Status: false,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.Customer_ID) { setError('Customer ID is required.'); return; }
    if (!formData.Meter_ID) { setError('Meter ID is required.'); return; }
    if (!formData.Billing_Date) { setError('Billing Date is required.'); return; }
    if (!formData.Previous_Reading) { setError('Previous Reading is required.'); return; }
    if (!formData.Current_Reading) { setError('Current Reading is required.'); return; }
    if (!formData.Rate_Applied) { setError('Rate Applied is required.'); return; }
    if (!formData.Amount_Due) { setError('Amount Due is required.'); return; }

    try {
      const payload = {
        ...formData,
        Bill_ID: formData.Bill_ID ? parseInt(formData.Bill_ID, 10) : undefined, // Handle if empty for create
        Customer_ID: parseInt(formData.Customer_ID, 10),
        Meter_ID: parseInt(formData.Meter_ID, 10),
        Previous_Reading: parseFloat(formData.Previous_Reading),
        Current_Reading: parseFloat(formData.Current_Reading),
        Rate_Applied: parseFloat(formData.Rate_Applied),
        Amount_Due: parseFloat(formData.Amount_Due),
      };
      delete payload.Total_Unit; // Ensure Total_Unit is not sent as it's DB generated

      if (isEditMode) {
        payload.Bill_ID = parseInt(formData.Bill_ID, 10);
      } else {
        if (!formData.Bill_ID || String(formData.Bill_ID).trim() === '') {
          delete payload.Bill_ID;
        } else {
          payload.Bill_ID = parseInt(formData.Bill_ID, 10);
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
        <h2>{isEditMode ? 'Edit Bill' : 'Create Bill'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form-container">
          <div>
            <label>Bill ID:</label>
            <input
              type="number"
              name="Bill_ID"
              value={formData.Bill_ID}
              onChange={handleChange}
              disabled={isEditMode} />
          </div>
          <div>
            <label>Customer ID:</label>
            <input type="number" name="Customer_ID" value={formData.Customer_ID} onChange={handleChange} required />
          </div>
          <div>
            <label>Meter ID:</label>
            <input type="number" name="Meter_ID" value={formData.Meter_ID} onChange={handleChange} required />
          </div>
          <div>
            <label>Billing Date:</label>
            <input type="date" name="Billing_Date" value={formData.Billing_Date} onChange={handleChange} required />
          </div>
          <div>
            <label>Previous Reading:</label>
            <input type="number" step="0.01" name="Previous_Reading" value={formData.Previous_Reading} onChange={handleChange} required />
          </div>
          <div>
            <label>Current Reading:</label>
            <input type="number" step="0.01" name="Current_Reading" value={formData.Current_Reading} onChange={handleChange} required />
          </div>
          <div>
            <label>Rate Applied:</label>
            <input 
              type="number" step="0.0001" // Allow for more decimal places for rates
              name="Rate_Applied" value={formData.Rate_Applied} 
              onChange={handleChange} required 
            />
          </div>
          <div>
            <label>Amount Due:</label>
            <input type="number" step="0.01" name="Amount_Due" value={formData.Amount_Due} onChange={handleChange} required />
          </div>
          <div>
            <label>Due Date:</label>
            <input type="date" name="Due_Date" value={formData.Due_Date} onChange={handleChange} />
          </div>
          <div>
            <label>
              <input type="checkbox" name="Paid_Status" checked={formData.Paid_Status} onChange={handleChange} />
              Paid
            </label>
          </div>
            <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Create Bill'}</button>
            <button type="button" onClick={onClose} className="btn btn-light">Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default BillingForm;
