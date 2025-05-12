import React, { useState, useEffect, useCallback } from 'react';
import paymentService from './paymentService';
import PaymentForm from './PaymentForm';

function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentService.getAll();
      setPayments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch payments.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFormSubmit = async (paymentData) => {
    try {
      if (editingPayment) {
        await paymentService.update(editingPayment.Payment_ID, paymentData);
      } else {
        await paymentService.create(paymentData);
      }
      fetchPayments();
    } catch (err) {
      console.error('Failed to save payment:', err);
      throw err;
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingPayment(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await paymentService.delete(paymentId);
        fetchPayments();
      } catch (err) {
        setError(err.message || 'Failed to delete payment.');
      }
    }
  };

  if (loading) return <p>Loading payments...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container">
      <h2>Payment Management</h2>
      <div className="mb-20">
        <button onClick={handleAdd} className="btn btn-primary">Record New Payment</button>
      </div>

      <PaymentForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPayment(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingPayment}
        isEditMode={!!editingPayment}
      />

      {payments.length === 0 && !loading && <p>No payments found.</p>}
      {payments.length > 0 && (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Bill ID</th>
              <th>Payment Date</th>
              <th>Amount Paid</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.Payment_ID}>
                <td>{payment.Payment_ID}</td>
                <td>{payment.Bill_ID}</td>
                <td>{payment.Payment_Date ? new Date(payment.Payment_Date).toLocaleDateString() : 'N/A'}</td>
                <td>{payment.Amount_Paid}</td>
                <td>{payment.Payment_Method}</td>
                <td>{payment.Payment_Status == 'Completed' ? '✅' : payment.Payment_Status}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(payment)} className="btn btn-warning btn-sm">Edit</button>
                  <button onClick={() => handleDelete(payment.Payment_ID)} className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PaymentList;