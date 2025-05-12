import React, { useState } from 'react';
import customerPortalService from './customerPortalService';
// import { useNavigate } from 'react-router-dom'; // No longer navigating away for status
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';

function CustomerPaymentView() {
  const [identifier, setIdentifier] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [message, setMessage] = useState(''); // For success or info messages
  // const navigate = useNavigate(); // We will display messages on this page

  const handleIdentifierChange = (event) => {
    setIdentifier(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    setCheckoutError(''); // Clear previous checkout errors
    setLoading(true);
    setError('');
    setMessage('');
    setBills([]);

    try {
      const fetchedBills = await customerPortalService.getUnpaidBills(identifier);
      if (fetchedBills && fetchedBills.length > 0) {
        setBills(fetchedBills);
      } else {
        setMessage('No unpaid bills found for this identifier, or identifier not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch payment information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (bill) => {
    const billIdToPay = bill.Bill_ID;
    console.log(`Attempting to checkout Bill ID: ${billIdToPay}`);
    setLoading(true); // You might want a separate loading state for checkout
    setCheckoutError('');
    setMessage('');

    try {
      // Using a default payment method, e.g., "Online Portal" or "Credit Card"
      // Ensure this payment method is valid according to your DB constraints
      const response = await customerPortalService.processBillPayment(
        billIdToPay,
        "Online Portal" // Or another default valid payment method
      );
      // Display success message on the current page
      setMessage(response.message || `Payment for Bill ID: ${billIdToPay} processed successfully!`);
      setCheckoutError(''); // Clear any previous error
      // Refresh the list of unpaid bills
      // A simple way is to re-submit the form to fetch bills again
      // Or, filter out the paid bill from the current 'bills' state
      setBills(currentBills => currentBills.filter(bill => bill.Bill_ID !== billIdToPay));
    } catch (err) {
      // Display error message on the current page
      setCheckoutError(err.message || `Failed to process payment for Bill ID: ${billIdToPay}.`);
      setMessage(''); // Clear any previous success message
    } finally {
      setLoading(false); // Reset general loading or specific checkout loading state
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ padding: 3 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          View Your Payments
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="identifier"
            label="Email or Phone Number"
            name="identifier"
            autoComplete="email" // or "tel"
            autoFocus
            value={identifier}
            onChange={handleIdentifierChange}
            error={!!error && !identifier.trim()} // Show error if field is empty on submit attempt
          />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Find My Bills'}
          </Button>
        </Box>
      </Paper>

      {message && !bills.length && (
        <Alert severity="info" sx={{ mt: 3 }}>{message}</Alert>
      )}

      {checkoutError && (
        <Alert severity="error" sx={{ mt: 2 }}>{checkoutError}</Alert>
      )}

      {bills.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography component="h2" variant="h6" gutterBottom>
            Your Unpaid Bills
          </Typography>
          <List component={Paper}>
            {bills.map((bill, index) => (
              <React.Fragment key={bill.Bill_ID}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={`Bill ID: ${bill.Bill_ID} - Amount Due: ${bill.Amount_Due} THB`}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          Due Date: {bill.Due_Date ? new Date(bill.Due_Date).toLocaleDateString() : 'N/A'}
                        </Typography>
                        <br />
                        Billing Date: {bill.Billing_Date ? new Date(bill.Billing_Date).toLocaleDateString() : 'N/A'}
                        <br />
                        Total Units: {bill.Total_Unit || 'N/A'}
                      </>
                    }
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleCheckout(bill)}
                    sx={{ ml: 2 }}
                    disabled={loading}
                  >
                    Checkout
                  </Button>
                </ListItem>
                {index < bills.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

    </Container>
  );
}

export default CustomerPaymentView;