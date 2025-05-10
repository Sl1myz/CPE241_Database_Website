import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ auth }) => {
  const token = localStorage.getItem('token'); // Or use auth prop

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;