@echo off
REM Quick runner for daily automations
REM Can be double-clicked or run from command line

cd /d C:\Users\jayso\master-ops
echo Running daily automations...
echo.

node scripts\local-automation-runner.js all

echo.
echo Done. Press any key to close.
pause >nul
