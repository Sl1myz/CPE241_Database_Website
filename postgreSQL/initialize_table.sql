DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Billing;
DROP TABLE IF EXISTS Meter;
DROP TABLE IF EXISTS Customer;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  permission VARCHAR(50)
);

CREATE TABLE Customer (
    Customer_ID SERIAL PRIMARY KEY,
    Name VARCHAR (100),
    Address VARCHAR (255),
    Email VARCHAR (100),
    Phone_Number VARCHAR(15)
);

CREATE TABLE Meter(
    Meter_ID SERIAL PRIMARY KEY,
    Customer_ID INT,
    Meter_Number VARCHAR (50),
    Installation_Date Date,
    Active_Status BOOLEAN,
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID)
);

CREATE TABLE Billing(
    Bill_ID SERIAL PRIMARY KEY,
    Customer_ID INT,
    Meter_ID INT,
    Billing_Date DATE,
    Due_Date DATE,
    Total_Unit DECIMAL(10, 2),
    Amount_Due DECIMAL(10, 2),
    Paid_Status BOOLEAN,
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID),
    FOREIGN KEY (Meter_ID) REFERENCES Meter(Meter_ID)
);

CREATE TABLE Payment (
    Payment_ID SERIAL PRIMARY KEY,
    Bill_ID INT,
    Payment_Date DATE,
    Amount_Paid DECIMAL(10, 2),
    Payment_Method VARCHAR(50),
    FOREIGN KEY (Bill_ID) REFERENCES Billing(Bill_ID)
);

-- Sample user (replace with your actual hashed password generation)
-- Password for 'admin' is 'root'
-- Bcrypt hash for 'root' (cost 10): $2a$10$nAIL5przC.RemyJ2CDmWKetjj1LnM64dwgtxj6SJ/kHlncKpihk6K
INSERT INTO users (username, password_hash, email, permission) VALUES
('admin', '$2a$10$nAIL5przC.RemyJ2CDmWKetjj1LnM64dwgtxj6SJ/kHlncKpihk6K', 'admin@example.com', 'administrator');

INSERT INTO Customer (Customer_ID, Name, Address, Email, Phone_Number) VALUES
(1, 'Alice Dearest', '123 Maple Street', 'alice@example.com', '123-456-7890'),
(2, 'Bob Los', '456 Oak Avenue', 'bob@example.com', '987-654-3210'),
(3, 'Charlie Darwin', '789 Pallet City', 'charlie@gmail.com', '023-023-2332');

INSERT INTO Meter (Meter_ID, Customer_ID, Meter_Number, Installation_Date, Active_Status) VALUES
(101, 1, 'MTR12345', '2023-01-15', TRUE),
(102, 2, 'MTR67890', '2023-03-22', TRUE),
(103, 3, 'MTR11121', '2023-05-30', FALSE);

INSERT INTO Billing (Bill_ID, Customer_ID, Meter_ID, Billing_Date, Due_Date, Total_Unit, Amount_Due, Paid_Status) VALUES
(1001, 1, 101, '2024-04-01', '2024-04-15', 120.5, 60.25, FALSE),
(1002, 2, 102, '2024-04-01', '2024-04-15', 150.0, 75.00, TRUE),
(1003, 3, 103, '2024-04-01', '2024-04-15', 120.5, 60.25, TRUE);

INSERT INTO Payment (Payment_ID, Bill_ID, Payment_Date, Amount_Paid, Payment_Method) VALUES
(5001, 1002, '2024-04-10', 75.00, 'Credit Card'),
(5002, 1001, '2024-04-10', 60.25, 'Credit Card'),
(5003, 1003, '2024-04-10', 60.25, 'Credit Card');

SELECT * FROM Customer;