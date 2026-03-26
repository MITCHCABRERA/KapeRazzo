@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing backend dependencies...
  npm install
)
start "KapeRazzo Backend" cmd /k npm run dev
