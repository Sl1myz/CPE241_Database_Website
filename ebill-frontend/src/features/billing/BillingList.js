import React, { useState, useEffect, useCallback } from 'react';
import billingService from './billingService';
import BillingForm from './BillingForm';

function BillingList() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingService.getAll();
      setBills(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch bills.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleFormSubmit = async (billData) => {
    try {
      if (editingBill) {
        await billingService.update(editingBill.Bill_ID, billData);
      } else {
        await billingService.create(billData);
      }
      fetchBills();
    } catch (err) {
      console.error('Failed to save bill:', err);
      throw err;
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (billId) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await billingService.delete(billId);
        fetchBills();
      } catch (err) {
        setError(err.message || 'Failed to delete bill.');
      }
    }
  };

  if (loading) return <p>Loading bills...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container">
      <h2>Billing Management</h2>
      <div className="mb-20">
        <button onClick={handleAdd} className="btn btn-primary">Create New Bill</button>
      </div>

      <BillingForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingBill(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingBill}
        isEditMode={!!editingBill}
      />

      {bills.length === 0 && !loading && <p>No bills found.</p>}
      {bills.length > 0 && (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Bill ID</th>
              <th>Customer</th>
              <th>Meter ID</th>
              <th>Billing Date</th>
              <th>Units</th>
              <th>Rate</th>
              <th>Due Date</th>
              <th>Amount Due</th>
              <th>Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.Bill_ID}>
                <td>{bill.Bill_ID}</td>
                <td>{bill.Customer_Name}</td>
                <td>{bill.Meter_ID}</td>
                <td>{bill.Billing_Date ? new Date(bill.Billing_Date).toLocaleDateString() : 'N/A'}</td>
                <td>{bill.Total_Unit}</td>
                <td>x {bill.Rate_Applied}</td>
                <td>{bill.Due_Date ? new Date(bill.Due_Date).toLocaleDateString() : 'N/A'}</td>
                <td>{bill.Amount_Due} THB</td>
                <td>{bill.Paid_Status ? '✅' : '❌'}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(bill)} className="btn btn-warning btn-sm">Edit</button>
                  <button onClick={() => handleDelete(bill.Bill_ID)} className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default BillingList;