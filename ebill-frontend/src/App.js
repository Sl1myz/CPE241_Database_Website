import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import UserList from './UserList';
import LoginPage from './LoginPage';
import ProtectedRoute from './ProtectedRoute';
// Import new list components (you'll create these files)
import CustomerList from './features/customers/CustomerList';
import MeterList from './features/meters/MeterList';
import BillingList from './features/billing/BillingList';
import PaymentList from './features/payments/PaymentList';
import './App.css'; // Optional: for basic styling

function App() {
  // Basic auth state, can be improved with Context API or Redux for larger apps
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const permission = localStorage.getItem('permission'); // Changed from role to permission
    if (token && username) {
      setAuth({ token, username, permission }); // Changed from role to permission
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('permission'); // Changed from role to permission
    setAuth(null);
    // The ProtectedRoute will automatically redirect to /login
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Electricity E-Billing System</h1>
          <nav>
            {auth && (
              <>
                <Link to="/users">Users</Link>
                <Link to="/customers">Customers</Link>
                <Link to="/meters">Meters</Link>
                <Link to="/billing">Billing</Link>
                <Link to="/payments">Payments</Link>
              </>
            )}
            {auth ? (
              <button onClick={handleLogout} className="btn-logout">Logout ({auth.username || 'User'})</button>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/login" element={<LoginPage setAuth={setAuth} />} />
            <Route element={<ProtectedRoute auth={auth} />}>
              <Route path="/users" element={<UserList />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/meters" element={<MeterList />} />
              <Route path="/billing" element={<BillingList />} />
              <Route path="/payments" element={<PaymentList />} />
              {/* Default protected route: if logged in and go to "/", redirect to "/users" */}
              <Route path="/" element={<Navigate replace to="/users" />} />
            </Route>
            {/* If not authenticated and trying to access a non-login path, redirect to login */}
            <Route path="*" element={auth ? <Navigate replace to="/" /> : <Navigate replace to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;