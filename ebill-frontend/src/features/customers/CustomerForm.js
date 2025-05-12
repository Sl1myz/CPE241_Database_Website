import React, { useState, useEffect } from 'react';

function CustomerForm({ isOpen, onClose, onSubmit, initialData, isEditMode }) {
  const [formData, setFormData] = useState({
    Customer_ID: '',
    Name: '',
    Address: '',
    Email: '',
    Phone_Number: '',
    Registration_Date: '', // Added for registration date
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        Customer_ID: initialData.Customer_ID ? String(initialData.Customer_ID) : '', // For input value
        // Format date for input type="date" if it exists
        Registration_Date: initialData.Registration_Date ? new Date(initialData.Registration_Date).toISOString().split('T')[0] : '',
      });
    } else {
      // Reset form for create mode or if initialData is null
      setFormData({
        Customer_ID: '',
        Name: '',
        Address: '',
        Email: '',
        Phone_Number: '',
        // Automatically set to today's date for new customers
        Registration_Date: new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData, isOpen]); // Depend on isOpen to reset form when modal opens for "create"

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.Name) {
        setError('Name is required.');
        return;
    }
    // Ensure Registration_Date is not an empty string if it's required by backend
    if (!formData.Registration_Date) {
        setError('Registration Date is required.');
        return;
    }
    try {
      const payload = {
        ...formData,
      };

      if (isEditMode) {
        payload.Customer_ID = parseInt(formData.Customer_ID, 10);
      } else {
        // If creating and Customer_ID is blank, remove it so backend/DB auto-generates
        if (!formData.Customer_ID || String(formData.Customer_ID).trim() === '') {
          delete payload.Customer_ID;
        } else {
          // If user explicitly provides an ID for a new record (though unusual for auto-gen)
          payload.Customer_ID = parseInt(formData.Customer_ID, 10);
        }
      }

      await onSubmit(payload);
      onClose(); // Close form on successful submission
    } catch (err) {
      setError(err.message || 'An error occurred.');
    }
  };

  // Basic modal styling (can be improved with a CSS file or library)
  const modalStyle = {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modalContentStyle = {
    background: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditMode ? 'Edit Customer' : 'Add Customer'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form-container">
          <div>
            <label>Customer ID:</label>
            <input
              type="number" // Using type="number" can help with input, but value is still string
              name="Customer_ID"
              value={formData.Customer_ID}
              onChange={handleChange}
              disabled={isEditMode} // Corrected: Disabled only in edit mode
            />
          </div>
          <div>
            <label>Name:</label>
            <input type="text" name="Name" value={formData.Name} onChange={handleChange} required />
          </div>
          <div>
            <label>Address:</label>
            <input type="text" name="Address" value={formData.Address} onChange={handleChange} />
          </div>
          <div>
            <label>Email:</label>
            <input type="email" name="Email" value={formData.Email} onChange={handleChange} />
          </div>
          <div>
            <label>Phone Number:</label>
            <input type="text" name="Phone_Number" value={formData.Phone_Number} onChange={handleChange} />
          </div>
          <div>
            <label>Registration Date:</label>
            <input
              type="date"
              name="Registration_Date"
              value={formData.Registration_Date}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Add Customer'}</button>
          <button type="button" onClick={onClose} className="btn btn-light">Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;
