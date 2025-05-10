DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Billing;
DROP TABLE IF EXISTS Meter;
DROP TABLE IF EXISTS Customer;

--Create users table with constraints
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  permission VARCHAR(50) NOT NULL CHECK (permission IN ('administrator','operator','customer','viewer')),
  Active_Status BOOLEAN NOT NULL DEFAULT TRUE
);

--Create Customer table with constraints
CREATE TABLE Customer (
    Customer_ID SERIAL PRIMARY KEY,
    Name VARCHAR (100) NOT NULL,
    Address VARCHAR (255) NOT NULL,
    Email VARCHAR (100) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    Phone_Number VARCHAR(15) CHECK (Phone_Number ~ '^\d{3}-\d{3}-\d{4}$'),
    Registration_Date DATE NOT NULL DEFAULT CURRENT_DATE,
    User_ID INTEGER UNIQUE,
    Active_Status BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (User_ID) REFERENCES users(id) ON DELETE SET NULL
);

--Create Meter table with constraints
CREATE TABLE Meter(
    Meter_ID SERIAL PRIMARY KEY,
    Customer_ID INTEGER NOT NULL,
    Meter_Number VARCHAR (50) NOT NULL UNIQUE,
    Installation_Date Date NOT NULL,
    Active_Status BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE CASCADE
);

--Create Billing Table with constraints
CREATE TABLE Billing(
    Bill_ID SERIAL PRIMARY KEY,
    Customer_ID INTEGER NOT NULL,
    Meter_ID INTEGER NOT NULL,
    Billing_Date DATE NOT NULL,
    Due_Date DATE NOT NULL,
    Previous_Reading DECIMAL(10, 2) NOT NULL CHECK (Previous_Reading >= 0),
    Current_Reading DECIMAL(10, 2) NOT NULL CHECK (Current_Reading >= Previous_Reading),
    Total_Unit DECIMAL(10, 2) GENERATED ALWAYS AS (Current_Reading - Previous_Reading) STORED,
    Rate_Applied DECIMAL(10, 4) NOT NULL CHECK (Rate_Applied > 0),
    Amount_Due DECIMAL(10, 2) NOT NULL CHECK (Amount_Due >= 0),
    Paid_Status BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID),
    FOREIGN KEY (Meter_ID) REFERENCES Meter(Meter_ID),
    CONSTRAINT valid_due_date CHECK (Due_Date >= Billing_Date)
);

CREATE TABLE Payment (
    Payment_ID SERIAL PRIMARY KEY,
    Bill_ID INTEGER,
    Processed_By INTEGER,
    Payment_Date DATE NOT NULL,
    Amount_Paid DECIMAL(10, 2) NOT NULL CHECK (Amount_Paid > 0),
    Payment_Method VARCHAR(50) NOT NULL CHECK (Payment_Method IN ('Credit Card', 'Bank Transfer', 'Cash', 'Check', 'Online Payment')),
    Transaction_ID VARCHAR(100) UNIQUE,
    Payment_Status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (Payment_Status IN ('pending', 'completed', 'failed', 'refunded')),
    FOREIGN KEY (Bill_ID) REFERENCES Billing(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Processed_By) REFERENCES users(id) ON DELETE SET NULL  -- Reference to the user who processed the payment
);

-- Create indexes for performance optimization
CREATE INDEX idx_customer_email ON Customer(Email);
CREATE INDEX idx_customer_name ON Customer(Name);
CREATE INDEX idx_meter_customer ON Meter(Customer_ID);
CREATE INDEX idx_meter_number ON Meter(Meter_Number);
CREATE INDEX idx_billing_customer ON Billing(Customer_ID);
CREATE INDEX idx_billing_dates ON Billing(Billing_Date, Due_Date);
CREATE INDEX idx_billing_paid ON Billing(Paid_Status);
CREATE INDEX idx_payment_date ON Payment(Payment_Date);
CREATE INDEX idx_payment_bill ON Payment(Bill_ID);

-- Create trigger function to update Paid_Status in Billing table when a payment is made
CREATE OR REPLACE FUNCTION update_billing_paid_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10, 2);
    bill_amount DECIMAL(10, 2);
BEGIN
    -- Calculate total payments for this bill
    SELECT COALESCE(SUM(Amount_Paid), 0) INTO total_paid
    FROM Payment
    WHERE Bill_ID = NEW.Bill_ID AND Payment_Status = 'completed';
    
    -- Get the bill amount
    SELECT Amount_Due INTO bill_amount
    FROM Billing
    WHERE Bill_ID = NEW.Bill_ID;
    
    -- Update paid status if payment covers the bill
    IF total_paid >= bill_amount THEN
        UPDATE Billing
        SET Paid_Status = TRUE
        WHERE Bill_ID = NEW.Bill_ID;
    ELSE
        UPDATE Billing
        SET Paid_Status = FALSE
        WHERE Bill_ID = NEW.Bill_ID;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update billing paid status
CREATE TRIGGER trg_payment_update_billing
AFTER INSERT OR UPDATE ON Payment
FOR EACH ROW
EXECUTE FUNCTION update_billing_paid_status();

-- Create a view to see unpaid bills
CREATE OR REPLACE VIEW unpaid_bills AS
SELECT 
    b.Bill_ID, 
    c.Customer_ID,
    c.Name AS Customer_Name,
    b.Billing_Date,
    b.Due_Date,
    b.Amount_Due,
    CASE 
        WHEN CURRENT_DATE > b.Due_Date THEN CURRENT_DATE - b.Due_Date
        ELSE 0
    END AS Days_Overdue
FROM 
    Billing b
JOIN 
    Customer c ON b.Customer_ID = c.Customer_ID
WHERE 
    b.Paid_Status = FALSE
ORDER BY 
    Days_Overdue DESC, b.Due_Date ASC;

-- Create a view for customer consumption history
CREATE OR REPLACE VIEW customer_consumption AS
SELECT 
    c.Customer_ID,
    c.Name,
    m.Meter_ID,
    m.Meter_Number,
    b.Billing_Date,
    b.Total_Unit,
    b.Amount_Due,
    b.Paid_Status
FROM 
    Customer c
JOIN 
    Meter m ON c.Customer_ID = m.Customer_ID
JOIN 
    Billing b ON m.Meter_ID = b.Meter_ID
ORDER BY 
    c.Customer_ID, b.Billing_Date DESC;

-- Sample user (replace with your actual hashed password generation)
-- Password for 'admin' is 'root'
-- Bcrypt hash for 'root' (cost 10): $2a$10$nAIL5przC.RemyJ2CDmWKetjj1LnM64dwgtxj6SJ/kHlncKpihk6K
INSERT INTO users (username, password_hash, email, permission) VALUES
('admin', '$2a$10$nAIL5przC.RemyJ2CDmWKetjj1LnM64dwgtxj6SJ/kHlncKpihk6K', 'admin@example.com', 'administrator');

INSERT INTO Customer (Customer_ID, Name, Address, Email, Phone_Number, Registration_Date, Active_Status) VALUES
(1, 'Aerith', '123 Maple Street', 'aerith@example.com', '123-456-7890', '2023-01-01', TRUE),
(2, 'Browser', '456 Oak Avenue', 'koopa@example.com', '987-654-3210', '2023-01-21', TRUE),
(3, 'Charles Carvin', '789 Pallet City', 'charles@gmail.com', '023-023-2332', '2023-02-01', TRUE);

INSERT INTO Meter (Meter_ID, Customer_ID, Meter_Number, Meter_Type, Installation_Date, Active_Status) VALUES
(101, 1, 'MTR12345', 'Standard', '2023-01-15', TRUE),
(102, 2, 'MTR67890', 'Standard','2023-03-22', TRUE),
(103, 3, 'MTR11121', 'Standard','2023-05-30', FALSE);

INSERT INTO Billing (Bill_ID, Customer_ID, Meter_ID, Billing_Date, Due_Date, Previous_Reading, Current_Reading, Rate_Applied, Amount_Due, Paid_Status) VALUES
(1001, 1, 101, '2024-04-01', '2024-04-15', 5000.00, 5120.50, 0.50, 60.25, FALSE),
(1002, 2, 102, '2024-04-01', '2024-04-15', 3000.00, 3150.00, 0.50, 75.00, TRUE),
(1003, 3, 103, '2024-04-01', '2024-04-15', 1200.00, 1320.50, 0.50, 60.25, TRUE);

INSERT INTO Payment (Payment_ID, Bill_ID, Payment_Date, Amount_Paid, Payment_Method, Transaction_ID) VALUES
(5001, 1002, '2024-04-10', 75.00, 'Credit Card', 'TXN123456'),
(5002, 1001, '2024-04-10', 60.25, 'Check', 'TXN789101'),
(5003, 1003, '2024-04-10', 60.25, 'Credit Card', 'TXN121314');

SELECT * FROM Customer;