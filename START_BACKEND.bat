@echo off
echo Starting Quote Portal Backend Server...
echo.
echo Make sure PostgreSQL is running before starting!
echo.
cd /d %~dp0
node server.js
pause
