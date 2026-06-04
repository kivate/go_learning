package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type runRequest struct {
	Code string `json:"code"`
}

type runResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
	Ms     int64  `json:"ms"`
}

func handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req runRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp := executeCode(req.Code)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func executeCode(code string) runResponse {
	start := time.Now()

	dir, err := os.MkdirTemp("", "go-practice-*")
	if err != nil {
		return runResponse{Error: "無法建立暫存目錄：" + err.Error()}
	}
	defer os.RemoveAll(dir)

	file := filepath.Join(dir, "main.go")
	if err := os.WriteFile(file, []byte(code), 0o600); err != nil {
		return runResponse{Error: "無法寫入程式碼：" + err.Error()}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "go", "run", file)
	out, err := cmd.CombinedOutput()
	ms := time.Since(start).Milliseconds()

	output := string(out)
	const maxOutput = 10000
	if len(output) > maxOutput {
		output = output[:maxOutput] + "\n... (輸出已截斷，超過 10000 字元)"
	}

	if ctx.Err() == context.DeadlineExceeded {
		return runResponse{Error: "⏰ 執行逾時（超過 15 秒）", Ms: ms}
	}
	if err != nil {
		return runResponse{Error: output, Ms: ms}
	}
	return runResponse{Output: output, Ms: ms}
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/run", handleRun)
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	addr := ":8080"
	fmt.Printf("🐹 Go 練習平台已啟動：http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
