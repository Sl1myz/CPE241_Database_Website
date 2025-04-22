package main

import (
	"fmt"
	"log"
	"net/http"
)

func startServer() {
	// Serve the index.html file directly when accessing the root URL
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "web-server/index.html")
		} else {
			http.FileServer(http.Dir(".")).ServeHTTP(w, r)
		}
	})

	fmt.Println("Serving on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	// Use 'go run .\web-server\web-server.go' or press run in VSCode with GO extension
	startServer()
}
