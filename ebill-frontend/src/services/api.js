const BASE_URL = 'http://localhost:8080/api'; // Adjust if your Go backend API prefix is different

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (response.status === 204) { // No Content, typically for DELETE
      return null;
    }

    const contentType = response.headers.get("content-type");
    let data;
    let responseTextForError = ''; // To store raw text if JSON parsing fails

    if (contentType && contentType.indexOf("application/json") !== -1) {
      try {
        data = await response.json();
      } catch (e) {
        // Try to get the raw text for better error reporting if JSON parsing fails
        responseTextForError = await response.text().catch(() => "Could not read response text.");
        console.error(`Failed to parse JSON response from ${endpoint}:`, e, `Raw response text: ${responseTextForError.substring(0, 200)}`);
        throw new Error(`Invalid JSON response from server: ${e.message}. Response started with: ${responseTextForError.substring(0,100)}`);
      }
    } else {
      // If not JSON, read as text. This might be an error page HTML or plain text error.
      responseTextForError = await response.text();
      if (!response.ok) {
        // If response is not ok and not JSON, the text itself is likely the error message
        throw new Error(responseTextForError || `HTTP error! status: ${response.status}`);
      }
      // If response is ok but not JSON, this is unexpected for an API client designed for JSON.
      console.warn(`API response for ${endpoint} was not JSON. Content-Type: ${contentType}. Body: ${responseTextForError.substring(0,100)}`);
      throw new Error(`Unexpected response format. Expected JSON, got ${contentType || 'unknown'}.`);
    }

    if (!response.ok) {
      // Handle common auth errors by redirecting to login
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('permission'); // Ensure this matches your localStorage key
        // Consider a more robust way to trigger navigation if not in a component
        window.location.href = '/login';
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API request failed: ${options.method || 'GET'} ${endpoint}`, error);
    throw error; // Re-throw to be caught by the calling service/component
  }
}

export default request;