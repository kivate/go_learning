@echo off
cd /d "%~dp0"
echo Starting Go Practice Web at http://localhost:8080
start http://localhost:8080
go run main.go
pause
