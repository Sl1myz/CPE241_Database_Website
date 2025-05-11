package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// GeneratePasswordHash takes a password string and returns its bcrypt hash.
// This function can be called from other parts of your application if needed,
// for example, when creating new users.
func GeneratePasswordHash(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to generate hash: %w", err)
	}
	return string(hashedPassword), nil
}

// The original main function from this file is commented out below.
// If you need to run this file as a standalone script to generate a password hash:
// 1. You can uncomment the main() function below.
// 2. Then, run this file specifically using:
//    go run d:\KMUTT\67_2\CPE241\CPE241_Database_Website\ebill-backend\password_hash.go
//    (Ensure your server's main() in main.go is not being compiled at the same time if you uncomment this).
/*
func main() {
	passwordToHash := "root" // Change this to the password you want to hash
	hash, err := GeneratePasswordHash(passwordToHash)
	if err != nil {
		log.Fatalf("Error generating password hash: %v", err)
	}
	fmt.Println("Hashed password:", hash)
}
*/
