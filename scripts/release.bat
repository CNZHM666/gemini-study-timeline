@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\release.ps1" -OpenDist
echo.
echo Release flow finished.
pause
