package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv" // For converting string IDs from path params to int
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq" // PostgreSQL driver
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

// jwtKey should be loaded from an environment variable in production!
var jwtKey = []byte("idkwhattosetthiskeyto")

// --- Struct Definitions Aligned with initialize_table.sql ---

// User struct
type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	Email        string `json:"email"`
	Permission   string `json:"permission"`
}

// Customer struct
type Customer struct {
	CustomerID       int    `json:"Customer_ID"`
	Name             string `json:"Name"`
	Address          string `json:"Address"`
	Email            string `json:"Email"`
	PhoneNumber      string `json:"Phone_Number"`
	RegistrationDate string `json:"Registration_Date"`
}

// Meter struct
type Meter struct {
	MeterID          int    `json:"Meter_ID"`
	CustomerID       int    `json:"Customer_ID"` // Foreign Key
	MeterNumber      string `json:"Meter_Number"`
	InstallationDate string `json:"Installation_Date"` // Store as YYYY-MM-DD string, or use time.Time and handle formatting
	ActiveStatus     bool   `json:"Active_Status"`
}

// Billing struct
type Billing struct {
	BillID          int     `json:"Bill_ID"`
	CustomerID      int     `json:"Customer_ID"` // Foreign Key
	Customer_Name   string  `json:"Customer_Name"`
	MeterID         int     `json:"Meter_ID"`     // Foreign Key
	BillingDate     string  `json:"Billing_Date"` // Store as YYYY-MM-DD string, or use time.Time
	DueDate         string  `json:"Due_Date"`     // Store as YYYY-MM-DD string, or use time.Time
	ReadingPrevious float64 `json:"Previous_Reading"`
	ReadingCurrent  float64 `json:"Current_Reading"`
	RateApplied     float64 `json:"Rate_Applied"`
	TotalUnit       float64 `json:"Total_Unit"` // Corresponds to DECIMAL(10, 2)
	AmountDue       float64 `json:"Amount_Due"` // Corresponds to DECIMAL(10, 2)
	PaidStatus      bool    `json:"Paid_Status"`
}

// Payment struct
type Payment struct {
	PaymentID     int     `json:"Payment_ID"`
	BillID        int     `json:"Bill_ID"` // Foreign Key
	ProcessedBy   int     `json:"Processed_By"`
	PaymentDate   string  `json:"Payment_Date"` // Store as YYYY-MM-DD string, or use time.Time
	AmountPaid    float64 `json:"Amount_Paid"`  // Corresponds to DECIMAL(10, 2)
	PaymentMethod string  `json:"Payment_Method"`
	PaymentStatus string  `json:"Payment_Status"`
}

// Credentials struct for login request
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// CustomClaims includes standard claims and custom ones like Permission.
type CustomClaims struct {
	Username   string `json:"username"`
	Permission string `json:"permission"`
	jwt.RegisteredClaims
}

// ContextKey is a type used for context keys to avoid collisions.
type ContextKey string

const (
	// UserClaimsKey is the key for storing user claims in the request context.
	UserClaimsKey ContextKey = "userClaims"
)

func init() {
	var err error
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "5432"
	}
	if dbUser == "" {
		dbUser = "postgres"
	}
	if dbPassword == "" {
		dbPassword = "root"
	}
	if dbName == "" {
		dbName = "ebill"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	log.Printf("Connecting to database: host=%s port=%s user=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbName)
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}
	err = db.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}
	log.Println("Successfully connected to the database.")
}

// respondWithError sends a JSON error message with a specific status code.
func respondWithError(w http.ResponseWriter, code int, message string) {
	log.Printf("Error response: status=%d, message=%s", code, message)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// respondWithJSON sends a JSON success message.
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // Your React app's origin
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	var user User
	query := "SELECT id, username, email, permission, password_hash FROM users WHERE username = $1"
	err := db.QueryRow(query, creds.Username).Scan(&user.ID, &user.Username, &user.Email, &user.Permission, &user.PasswordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusUnauthorized, "Invalid username or password")
		} else {
			log.Printf("Database error during login for user '%s': %v", creds.Username, err)
			respondWithError(w, http.StatusInternalServerError, "Internal server error")
		}
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(creds.Password)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &CustomClaims{
		Username:   user.Username,
		Permission: user.Permission,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ebill-app",
			Subject:   fmt.Sprintf("%d", user.ID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Could not generate token")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{
		"token":      tokenString,
		"username":   user.Username,
		"permission": user.Permission,
	})
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
			respondWithError(w, http.StatusUnauthorized, "Invalid authorization header format")
			return
		}
		tokenString := tokenParts[1]
		claims := &CustomClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtKey, nil
		})

		if err != nil {
			respondWithError(w, http.StatusUnauthorized, "Invalid token: "+err.Error())
			return
		}
		if !token.Valid {
			respondWithError(w, http.StatusUnauthorized, "Token is not valid")
			return
		}
		ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// --- User Handlers ---
func getUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, username, email, permission FROM users")
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve users: "+err.Error())
		return
	}
	defer rows.Close()
	var usersList []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Permission); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error processing user data: "+err.Error())
			return
		}
		usersList = append(usersList, u)
	}
	if err = rows.Err(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving user data: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, usersList)
}

// --- Generic CRUD Handlers (Placeholders) ---
// You will replace these with specific logic for each entity

// --- Customer Handlers ---
func getCustomers(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getCustomers called")
	rows, err := db.Query(`SELECT "customer_id", "name", "address", "email", "phone_number", "registration_date" FROM "customer" ORDER BY customer_id ASC`)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve customers: "+err.Error())
		return
	}
	defer rows.Close()
	customers := []Customer{}
	for rows.Next() {
		var c Customer
		if err := rows.Scan(&c.CustomerID, &c.Name, &c.Address, &c.Email, &c.PhoneNumber, &c.RegistrationDate); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error scanning customer data: "+err.Error())
			return
		}
		customers = append(customers, c)
	}
	if err = rows.Err(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error iterating customer rows: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, customers)
}
func createCustomer(w http.ResponseWriter, r *http.Request) {
	log.Println("API: createCustomer called")
	var c Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	// ID will be auto-generated by the database
	// We expect other fields to be validated as necessary (e.g., Name not empty)

	sqlStatement := `INSERT INTO "customer" ("name", "address", "email", "phone_number", "registration_date") VALUES ($1, $2, $3, $4, $5) RETURNING "customer_id"`
	err := db.QueryRow(sqlStatement, c.Name, c.Address, c.Email, c.PhoneNumber, c.RegistrationDate).Scan(&c.CustomerID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create customer: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, c)
}
func getCustomerByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Customer ID not provided in path")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Customer ID format: "+err.Error())
		return
	}
	log.Printf("API: getCustomerByID called for ID: %d", id)

	var c Customer
	sqlStatement := `SELECT "customer_id", "name", "address", "email", "phone_number", "registration_date" FROM "customer" WHERE "customer_id" = $1`
	err = db.QueryRow(sqlStatement, id).Scan(&c.CustomerID, &c.Name, &c.Address, &c.Email, &c.PhoneNumber, &c.RegistrationDate)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Customer not found")
		} else {
			respondWithError(w, http.StatusInternalServerError, "Failed to retrieve customer: "+err.Error())
		}
		return
	}
	respondWithJSON(w, http.StatusOK, c)
}
func updateCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Customer ID not provided in path")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Customer ID format: "+err.Error())
		return
	}
	log.Printf("API: updateCustomer called for ID: %d", id)

	var c Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	sqlStatement := `UPDATE "customer" SET "name" = $1, "address" = $2, "email" = $3, "phone_number" = $4, "registration_date" = $5 WHERE "customer_id" = $6`
	res, err := db.Exec(sqlStatement, c.Name, c.Address, c.Email, c.PhoneNumber, c.RegistrationDate, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update customer: "+err.Error())
		return
	}
	count, err := res.RowsAffected()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to check affected rows: "+err.Error())
		return
	}
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Customer not found or no changes made")
		return
	}
	c.CustomerID = id // Ensure the returned customer has the correct ID from the path
	respondWithJSON(w, http.StatusOK, c)
}
func deleteCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Customer ID not provided in path")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Customer ID format: "+err.Error())
		return
	}
	log.Printf("API: deleteCustomer called for ID: %d", id)

	sqlStatement := `DELETE FROM "customer" WHERE "customer_id" = $1`
	res, err := db.Exec(sqlStatement, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete customer: "+err.Error())
		return
	}
	count, err := res.RowsAffected()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to check affected rows: "+err.Error())
		return
	}
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Customer not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Customer deleted successfully"})
}

// --- Meter Handlers ---
func getMeters(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getMeters called")
	rows, err := db.Query(`SELECT "meter_id", "customer_id", "meter_number", "installation_date", "active_status" FROM "meter" ORDER BY meter_id ASC`)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve meters: "+err.Error())
		return
	}
	defer rows.Close()
	meters := []Meter{}
	for rows.Next() {
		var m Meter
		if err := rows.Scan(&m.MeterID, &m.CustomerID, &m.MeterNumber, &m.InstallationDate, &m.ActiveStatus); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error scanning meter data: "+err.Error())
			return
		}
		meters = append(meters, m)
	}
	if err = rows.Err(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error iterating meter rows: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, meters)
}
func createMeter(w http.ResponseWriter, r *http.Request) {
	log.Println("API: createMeter called")
	var m Meter
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if m.CustomerID == 0 { // Foreign key, should be validated if it exists in Customer table
		respondWithError(w, http.StatusBadRequest, "Customer_ID is required for meter and cannot be 0")
		return
	}
	// Meter_ID will be auto-generated
	sqlStatement := `INSERT INTO "meter" ("customer_id", "meter_number", "installation_date", "active_status") VALUES ($1, $2, $3, $4) RETURNING "meter_id"`
	err := db.QueryRow(sqlStatement, m.CustomerID, m.MeterNumber, m.InstallationDate, m.ActiveStatus).Scan(&m.MeterID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create meter: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, m)
}
func getMeterByID(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getMeterByID called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"] // Error handling for missing ID can be added
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Meter ID format")
		return
	}
	var m Meter
	sqlStatement := `SELECT "meter_id", "customer_id", "meter_number", "installation_date", "active_status" FROM "meter" WHERE "meter_id" = $1`
	err = db.QueryRow(sqlStatement, id).Scan(&m.MeterID, &m.CustomerID, &m.MeterNumber, &m.InstallationDate, &m.ActiveStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Meter not found")
		} else {
			respondWithError(w, http.StatusInternalServerError, "Failed to retrieve meter: "+err.Error())
		}
		return
	}
	respondWithJSON(w, http.StatusOK, m)
}
func updateMeter(w http.ResponseWriter, r *http.Request) {
	log.Println("API: updateMeter called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Meter ID format")
		return
	}
	var m Meter
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	sqlStatement := `UPDATE "meter" SET "customer_id"=$1, "meter_number"=$2, "installation_date"=$3, "active_status"=$4 WHERE "meter_id"=$5`
	res, err := db.Exec(sqlStatement, m.CustomerID, m.MeterNumber, m.InstallationDate, m.ActiveStatus, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update meter: "+err.Error())
		return
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Meter not found or no changes made")
		return
	}
	m.MeterID = id
	respondWithJSON(w, http.StatusOK, m)
}
func deleteMeter(w http.ResponseWriter, r *http.Request) {
	log.Println("API: deleteMeter called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Meter ID format")
		return
	}
	sqlStatement := `DELETE FROM "meter" WHERE "meter_id" = $1`
	res, err := db.Exec(sqlStatement, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete meter: "+err.Error())
		return
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Meter not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Meter deleted successfully"})
}

// --- Billing Handlers ---
func getBillings(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getBillings called")
	rows, err := db.Query(`SELECT c.Name, b.bill_id, b.customer_id, b.meter_id, b.billing_date, b.due_date, 
	                        b.previous_reading, b.current_reading, b.rate_applied, b.total_unit, b.amount_due, b.paid_status FROM billing b, customer c, meter m
	                        WHERE b.customer_id = c.customer_id AND b.meter_id = m.meter_id ORDER BY bill_id ASC`)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve bills: "+err.Error())
		return
	}
	defer rows.Close()
	billings := []Billing{}
	for rows.Next() {
		var b Billing
		if err := rows.Scan(&b.Customer_Name, &b.BillID, &b.CustomerID, &b.MeterID, &b.BillingDate, &b.DueDate,
			&b.ReadingPrevious, &b.ReadingCurrent, &b.RateApplied, &b.TotalUnit, &b.AmountDue, &b.PaidStatus); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error scanning bill data: "+err.Error())
			return
		}
		billings = append(billings, b)
	}
	if err = rows.Err(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error iterating bill rows: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, billings)
}
func createBilling(w http.ResponseWriter, r *http.Request) {
	log.Println("API: createBilling called")
	var b Billing
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if b.CustomerID == 0 {
		respondWithError(w, http.StatusBadRequest, "Customer_ID is required for billing and cannot be 0")
		return
	}
	if b.MeterID == 0 {
		respondWithError(w, http.StatusBadRequest, "Meter_ID is required for billing and cannot be 0")
		return
	}
	// Bill_ID will be auto-generated
	// Total_Unit is generated by the database, so we don't insert it directly. We can return it.
	sqlStatement := `INSERT INTO "billing" ("customer_id", "meter_id", "billing_date", "due_date", 
	                 "previous_reading", "current_reading", "rate_applied", "amount_due", "paid_status") 
	                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "bill_id", "total_unit"`
	err := db.QueryRow(sqlStatement, b.CustomerID, b.MeterID, b.BillingDate, b.DueDate,
		b.ReadingPrevious, b.ReadingCurrent, b.RateApplied, b.AmountDue, b.PaidStatus).Scan(&b.BillID, &b.TotalUnit)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create bill: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, b)
}
func getBillingByID(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getBillingByID called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Bill ID")
		return
	}
	var b Billing
	sqlStatement := `SELECT "bill_id", "customer_id", "meter_id", "billing_date", "due_date", 
	                 "previous_reading", "current_reading", "rate_applied", "total_unit", "amount_due", "paid_status" 
									 FROM "billing" WHERE "bill_id" = $1`
	err = db.QueryRow(sqlStatement, id).Scan(&b.BillID, &b.CustomerID, &b.MeterID, &b.BillingDate, &b.DueDate,
		&b.ReadingPrevious, &b.ReadingCurrent, &b.RateApplied, &b.TotalUnit, &b.AmountDue, &b.PaidStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Bill not found")
		} else {
			respondWithError(w, http.StatusInternalServerError, "Failed to retrieve bill: "+err.Error())
		}
		return
	}
	respondWithJSON(w, http.StatusOK, b)
}
func updateBilling(w http.ResponseWriter, r *http.Request) {
	log.Println("API: updateBilling called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Bill ID")
		return
	}
	var b Billing
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	// Total_Unit is generated, so not included in SET. We can return it.
	sqlStatement := `UPDATE "billing" SET "customer_id"=$1, "meter_id"=$2, "billing_date"=$3, "due_date"=$4, 
	                 "previous_reading"=$5, "current_reading"=$6, "rate_applied"=$7, "amount_due"=$8, "paid_status"=$9 
									 WHERE "bill_id"=$10 RETURNING "total_unit"`
	err = db.QueryRow(sqlStatement, b.CustomerID, b.MeterID, b.BillingDate, b.DueDate,
		b.ReadingPrevious, b.ReadingCurrent, b.RateApplied, b.AmountDue, b.PaidStatus, id).Scan(&b.TotalUnit)
	if err != nil {
		if err == sql.ErrNoRows { // If QueryRow finds no rows, Scan returns sql.ErrNoRows
			respondWithError(w, http.StatusNotFound, "Bill not found or no changes made")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Failed to update bill: "+err.Error())
		return
	}
	b.BillID = id
	respondWithJSON(w, http.StatusOK, b)
}
func deleteBilling(w http.ResponseWriter, r *http.Request) {
	log.Println("API: deleteBilling called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Bill ID")
		return
	}
	sqlStatement := `DELETE FROM "billing" WHERE "bill_id" = $1`
	res, err := db.Exec(sqlStatement, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete bill: "+err.Error())
		return
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Bill not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Bill deleted successfully"})
}

// --- Payment Handlers ---
func getPayments(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getPayments called")
	rows, err := db.Query(`SELECT "payment_id", "bill_id", "processed_by", "payment_date", "amount_paid", "payment_method", "payment_status" FROM "payment" ORDER BY payment_id ASC`)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve payments: "+err.Error())
		return
	}
	defer rows.Close()
	payments := []Payment{}
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.PaymentID, &p.BillID, &p.ProcessedBy, &p.PaymentDate, &p.AmountPaid, &p.PaymentMethod, &p.PaymentStatus); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error scanning payment data: "+err.Error())
			return
		}
		payments = append(payments, p)
	}
	if err = rows.Err(); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error iterating payment rows: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, payments)
}
func createPayment(w http.ResponseWriter, r *http.Request) {
	log.Println("API: createPayment called")
	var p Payment
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if p.BillID == 0 { // Foreign key
		respondWithError(w, http.StatusBadRequest, "Bill_ID is required for payment and cannot be 0")
		return
	}
	// Payment_ID will be auto-generated
	sqlStatement := `INSERT INTO "payment" ("bill_id", "processed_by", "payment_date", "amount_paid", "payment_method", "payment_status") 
	                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING "payment_id"`
	err := db.QueryRow(sqlStatement, p.BillID, p.ProcessedBy, p.PaymentDate, p.AmountPaid, p.PaymentMethod, p.PaymentStatus).Scan(&p.PaymentID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create payment: "+err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, p)
}
func getPaymentByID(w http.ResponseWriter, r *http.Request) {
	log.Println("API: getPaymentByID called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Payment ID")
		return
	}
	var p Payment
	sqlStatement := `SELECT "payment_id", "bill_id", "processed_by", "payment_date", "amount_paid", "payment_method", "payment_status" 
	                 FROM "payment" WHERE "payment_id" = $1`
	err = db.QueryRow(sqlStatement, id).Scan(&p.PaymentID, &p.BillID, &p.ProcessedBy, &p.PaymentDate, &p.AmountPaid, &p.PaymentMethod, &p.PaymentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Payment not found")
		} else {
			respondWithError(w, http.StatusInternalServerError, "Failed to retrieve payment: "+err.Error())
		}
		return
	}
	respondWithJSON(w, http.StatusOK, p)
}
func updatePayment(w http.ResponseWriter, r *http.Request) {
	log.Println("API: updatePayment called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Payment ID")
		return
	}
	var p Payment
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	sqlStatement := `UPDATE "payment" SET "bill_id"=$1, "processed_by"=$2, "payment_date"=$3, "amount_paid"=$4, "payment_method"=$5, "payment_status"=$6 
	                 WHERE "payment_id"=$7`
	res, err := db.Exec(sqlStatement, p.BillID, p.ProcessedBy, p.PaymentDate, p.AmountPaid, p.PaymentMethod, p.PaymentStatus, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update payment: "+err.Error())
		return
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Payment not found or no changes made")
		return
	}
	p.PaymentID = id
	respondWithJSON(w, http.StatusOK, p)
}
func deletePayment(w http.ResponseWriter, r *http.Request) {
	log.Println("API: deletePayment called")
	vars := mux.Vars(r)
	idStr, _ := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid Payment ID")
		return
	}
	sqlStatement := `DELETE FROM "payment" WHERE "payment_id" = $1`
	res, err := db.Exec(sqlStatement, id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete payment: "+err.Error())
		return
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Payment not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Payment deleted successfully"})
}

func main() {
	envJwtKey := os.Getenv("JWT_SECRET_KEY")
	if envJwtKey != "" {
		jwtKey = []byte(envJwtKey)
		log.Println("JWT_SECRET_KEY loaded from environment variable.")
	} else if os.Getenv("APP_ENV") != "production" {
		log.Println("Warning: JWT_SECRET_KEY not set. Using default insecure key for development.")
	}

	router := mux.NewRouter()
	router.Use(enableCORS) // Apply CORS to all routes

	// Authentication route (not under /api, not typically auth-protected itself)
	router.HandleFunc("/login", handleLogin).Methods("POST", "OPTIONS")

	// User list route (not under /api, but requires auth)
	// http.HandlerFunc(getUsers) converts getUsers to an http.Handler, which authMiddleware expects.
	router.HandleFunc("/users", authMiddleware(http.HandlerFunc(getUsers)).(http.HandlerFunc)).Methods("GET", "OPTIONS")

	// API Subrouter for all other authenticated CRUD operations
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.Use(authMiddleware) // Apply auth middleware to all /api routes

	// Customer Routes
	apiRouter.HandleFunc("/customers", getCustomers).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/customers", createCustomer).Methods("POST", "OPTIONS")
	apiRouter.HandleFunc("/customers/{id}", getCustomerByID).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/customers/{id}", updateCustomer).Methods("PUT", "OPTIONS")
	apiRouter.HandleFunc("/customers/{id}", deleteCustomer).Methods("DELETE", "OPTIONS")

	// Meter Routes
	apiRouter.HandleFunc("/meters", getMeters).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/meters", createMeter).Methods("POST", "OPTIONS")
	apiRouter.HandleFunc("/meters/{id}", getMeterByID).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/meters/{id}", updateMeter).Methods("PUT", "OPTIONS")
	apiRouter.HandleFunc("/meters/{id}", deleteMeter).Methods("DELETE", "OPTIONS")

	// Billing Routes
	apiRouter.HandleFunc("/billing", getBillings).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/billing", createBilling).Methods("POST", "OPTIONS")
	apiRouter.HandleFunc("/billing/{id}", getBillingByID).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/billing/{id}", updateBilling).Methods("PUT", "OPTIONS")
	apiRouter.HandleFunc("/billing/{id}", deleteBilling).Methods("DELETE", "OPTIONS")

	// Payment Routes
	apiRouter.HandleFunc("/payments", getPayments).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/payments", createPayment).Methods("POST", "OPTIONS")
	apiRouter.HandleFunc("/payments/{id}", getPaymentByID).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/payments/{id}", updatePayment).Methods("PUT", "OPTIONS")
	apiRouter.HandleFunc("/payments/{id}", deletePayment).Methods("DELETE", "OPTIONS")

	fmt.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", router)) // Pass the main router
}
