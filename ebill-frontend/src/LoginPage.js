import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8080/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data;
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            // JSON parsing failed, stick with status code or try to get text
            const textError = await response.text().catch(() => null);
            errorMsg = textError || errorMsg;
          }
        } else {
          const textError = await response.text().catch(() => null);
          errorMsg = textError || errorMsg;
        }
        throw new Error(errorMsg);
      }

      // If response.ok, we expect JSON
      data = await response.json();
      // When handling login response
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('permission', data.permission);
      if (setAuth) setAuth({ token: data.token, username: data.username, permission: data.permission });
      navigate('/users'); // Redirect to a protected page, e.g., user list or dashboard
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="form-container">
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Login</button>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;