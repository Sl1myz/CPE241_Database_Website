import React, { useState, useEffect } from 'react';
// In a real app, you might fetch customers for a dropdown
// import customerService from '../customers/customerService';

function MeterForm({ isOpen, onClose, onSubmit, initialData, isEditMode }) {
  const [formData, setFormData] = useState({
    Meter_ID: '',
    Customer_ID: '',
    Meter_Number: '',
    Installation_Date: '',
    Active_Status: false,
  });
  const [error, setError] = useState('');
  // const [customers, setCustomers] = useState([]); // For dropdown

  useEffect(() => {
    // Example: Fetch customers for dropdown
    // const fetchCustomersForDropdown = async () => {
    //   try {
    //     const data = await customerService.getAll();
    //     setCustomers(data || []);
    //   } catch (err) {
    //     console.error("Failed to fetch customers for dropdown", err);
    //   }
    // };
    // if (isOpen) fetchCustomersForDropdown();

    if (initialData) {
      setFormData({
        ...initialData,
        Meter_ID: initialData.Meter_ID ? String(initialData.Meter_ID) : '',
        Customer_ID: initialData.Customer_ID ? String(initialData.Customer_ID) : '',
        // Ensure date is in YYYY-MM-DD for input type="date"
        Installation_Date: initialData.Installation_Date ? new Date(initialData.Installation_Date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        Meter_ID: '', Customer_ID: '', // Customer_ID will be string from input
        Meter_Number: '',
        Installation_Date: '', Active_Status: false,
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
    if (!formData.Customer_ID) {
      setError('Customer ID is required.');
      return;
    }
    if (!formData.Meter_Number) {
      setError('Meter Number is required.');
      return;
    }

    try {
      const payload = {
        ...formData,
        Customer_ID: parseInt(formData.Customer_ID, 10), // Foreign key, always parse
      };
      if (isEditMode) {
        payload.Meter_ID = parseInt(formData.Meter_ID, 10);
      } else {
        if (!formData.Meter_ID || String(formData.Meter_ID).trim() === '') {
          delete payload.Meter_ID;
        } else {
          payload.Meter_ID = parseInt(formData.Meter_ID, 10);
        }
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred.');
    }
  };

  const modalStyle = { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modalContentStyle = { background: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditMode ? 'Edit Meter' : 'Add Meter'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form-container">
          <div>
            <label>Meter ID:</label>
            <input
              type="number"
              name="Meter_ID"
              value={formData.Meter_ID}
              onChange={handleChange}
              disabled={isEditMode} />
          </div>
          <div>
            <label>Customer ID:</label>
            {/* Replace with a select dropdown in a real app */}
            <input type="number" name="Customer_ID" value={formData.Customer_ID} onChange={handleChange} required />
            {/* <select name="Customer_ID" value={formData.Customer_ID} onChange={handleChange} required>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.Customer_ID} value={c.Customer_ID}>{c.Name} (ID: {c.Customer_ID})</option>)}
            </select> */}
          </div>
          <div>
            <label>Meter Number:</label>
            <input type="text" name="Meter_Number" value={formData.Meter_Number} onChange={handleChange} required />
          </div>
          <div>
            <label>Installation Date:</label>
            <input type="date" name="Installation_Date" value={formData.Installation_Date} onChange={handleChange} />
          </div>
          <div>
            <label>
              <input type="checkbox" name="Active_Status" checked={formData.Active_Status} onChange={handleChange} />
              Active
            </label>
          </div>
            <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Add Meter'}</button>
            <button type="button" onClick={onClose} className="btn btn-light">Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default MeterForm;
