@echo off
REM Helper script to run npm commands without PowerShell execution policy issues
cd /d %~dp0
npm run build
pause



