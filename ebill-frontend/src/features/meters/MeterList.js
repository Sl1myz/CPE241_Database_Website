import React, { useState, useEffect, useCallback } from 'react';
import meterService from './meterService';
import MeterForm from './MeterForm';

function MeterList() {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);

  const fetchMeters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await meterService.getAll();
      setMeters(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch meters.');
      setMeters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeters();
  }, [fetchMeters]);

  const handleFormSubmit = async (meterData) => {
    try {
      if (editingMeter) {
        await meterService.update(editingMeter.Meter_ID, meterData);
      } else {
        await meterService.create(meterData);
      }
      fetchMeters();
    } catch (err) {
      console.error('Failed to save meter:', err);
      throw err;
    }
  };

  const handleEdit = (meter) => {
    setEditingMeter(meter);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingMeter(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (meterId) => {
    if (window.confirm('Are you sure you want to delete this meter?')) {
      try {
        await meterService.delete(meterId);
        fetchMeters();
      } catch (err) {
        setError(err.message || 'Failed to delete meter.');
      }
    }
  };

  if (loading) return <p>Loading meters...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container">
      <h2>Meter Management</h2>
      <div className="mb-20">
        <button onClick={handleAdd} className="btn btn-primary">Add New Meter</button>
      </div>

      <MeterForm
        isOpen={isFormOpen}
        onClose={() => {
            setIsFormOpen(false);
            setEditingMeter(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingMeter}
        isEditMode={!!editingMeter}
      />

      {meters.length === 0 && !loading && <p>No meters found.</p>}
      {meters.length > 0 && (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Meter ID</th>
              <th>Customer ID</th>
              <th>Meter Number</th>
              <th>Installation Date</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {meters.map((meter) => (
              <tr key={meter.Meter_ID}>
                <td>{meter.Meter_ID}</td>
                <td>{meter.Customer_ID}</td>
                <td>{meter.Meter_Number}</td>
                <td>{meter.Installation_Date ? new Date(meter.Installation_Date).toLocaleDateString() : 'N/A'}</td>
                <td>{meter.Active_Status ? '✅' : '❌'}</td>
                <td>
                  <button onClick={() => handleEdit(meter)} className="btn btn-warning btn-sm">Edit</button>
                  <button onClick={() => handleDelete(meter.Meter_ID)} className="btn btn-danger btn-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MeterList;