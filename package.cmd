@echo off
REM Helper script to package the app without PowerShell execution policy issues
cd /d %~dp0
npm run package:zip
pause



