import React, { useState, useEffect, useCallback } from 'react';
import customerService from './customerService';
import CustomerForm from './CustomerForm';

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null for create, object for edit

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getAll();
      setCustomers(data || []); // Ensure customers is an array
    } catch (err) {
      setError(err.message || 'Failed to fetch customers.');
      setCustomers([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFormSubmit = async (customerData) => {
    try {
      if (editingCustomer) {
        // Update: Customer_ID is part of customerData from the form if editing
        await customerService.update(editingCustomer.Customer_ID, customerData);
      } else {
        await customerService.create(customerData);
      }
      fetchCustomers(); // Refresh list
      // setIsFormOpen(false); // Form closes itself on successful submit
      // setEditingCustomer(null);
    } catch (err) {
      console.error('Failed to save customer:', err);
      // The form itself will display the error, re-throw to prevent form from closing
      throw err;
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingCustomer(null); // Clear any editing state
    setIsFormOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.delete(customerId);
        fetchCustomers(); // Refresh list
      } catch (err) {
        setError(err.message || 'Failed to delete customer.');
      }
    }
  };

  if (loading) return <p>Loading customers...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container">
      <h2>Customer Management</h2>
      <div className="mb-20">
        <button onClick={handleAdd} className="btn btn-primary">Add New Customer</button>
      </div>

      <CustomerForm
        isOpen={isFormOpen}
        onClose={() => {
            setIsFormOpen(false);
            setEditingCustomer(null); // Clear editing state when form is explicitly closed
        }}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer}
        isEditMode={!!editingCustomer}
      />

      {customers.length === 0 && !loading && <p>No customers found.</p>}
      {customers.length > 0 && (
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Address</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.Customer_ID}>
                <td>{customer.Customer_ID}</td>
                <td>{customer.Name}</td>
                <td>{customer.Address}</td>
                <td>{customer.Email}</td>
                <td>{customer.Phone_Number}</td>
                <td>{customer.Registration_Date ? new Date(customer.Registration_Date).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <button onClick={() => handleEdit(customer)} className="btn btn-warning btn-sm">Edit</button>
                  <button onClick={() => handleDelete(customer.Customer_ID)} className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CustomerList;