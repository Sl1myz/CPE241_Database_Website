import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // This should ideally be caught by ProtectedRoute, but as a safeguard:
      navigate('/login');
      return;
    }

    // Ensure your Go backend is running and accessible at http://localhost:8080
    fetch('http://localhost:8080/users', {
      headers: {
        'Authorization': `Bearer ${token}`, // Send the token
      },
    })
      .then(async response => { // Make async to handle potential text() or json() parsing
        if (!response.ok) {
          if (response.status === 401) { // Unauthorized or Invalid token
            localStorage.removeItem('token'); // Clear invalid token
            localStorage.removeItem('username');
            localStorage.removeItem('permission'); // Ensure this matches your localStorage key
            navigate('/login'); // Redirect to login
          }
          // For other errors, try to parse JSON, otherwise get text
          let errorMsg = `HTTP error! status: ${response.status}`;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            try {
              const errorData = await response.json();
              errorMsg = errorData.error || errorMsg;
            } catch (e) {
              const textError = await response.text().catch(() => null);
              errorMsg = textError || errorMsg;
            }
          } else {
            const textError = await response.text().catch(() => null);
            errorMsg = textError || errorMsg;
          }
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then(data => {
        console.log("UserList.js: Data received from backend:", data);
        setUsers(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching users:", error);
        setError(error.message);
        setLoading(false);
      });
  }, [navigate]); // Add navigate to dependency array

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>Error fetching users: {error}</p>;
  }

  return (
    <div className="page-container">
      <h2>User List</h2>
      {users && users.length > 0 ? (
        <ul className="styled-list">
          {users.map(user => (
            <li key={user.id}>
              <strong>ID:</strong> {user.id}, <strong>Username:</strong> {user.username}, <strong>Email:</strong> {user.email}
            </li>
          ))}
        </ul>
      ) : (
        <p>No users found.</p>
      )}
    </div>
  );
}

export default UserList;