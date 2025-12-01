@echo off
REM =============================================================================
REM Windows Task Scheduler Setup for Master-Ops Automations
REM =============================================================================
REM Run this script as Administrator to create scheduled tasks
REM
REM Tasks created:
REM   1. MasterOps-Daily (9:00 AM) - All daily automations
REM   2. MasterOps-StockSync-AM (8:00 AM) - BOO stock sync
REM   3. MasterOps-StockSync-PM (8:00 PM) - BOO stock sync
REM =============================================================================

SET PROJECT_PATH=C:\Users\jayso\master-ops
SET NODE_PATH=node

echo.
echo ============================================
echo Master-Ops Task Scheduler Setup
echo ============================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Creating scheduled tasks...
echo.

REM Task 1: Daily automations at 9:00 AM
echo [1/3] Creating MasterOps-Daily task (9:00 AM)...
schtasks /create /tn "MasterOps-Daily" ^
    /tr "\"%NODE_PATH%\" \"%PROJECT_PATH%\scripts\local-automation-runner.js\" all" ^
    /sc daily /st 09:00 ^
    /ru "%USERNAME%" ^
    /f

if %errorLevel% equ 0 (
    echo      ✓ MasterOps-Daily created
) else (
    echo      ✗ Failed to create MasterOps-Daily
)

REM Task 2: Stock sync at 8:00 AM
echo [2/3] Creating MasterOps-StockSync-AM task (8:00 AM)...
schtasks /create /tn "MasterOps-StockSync-AM" ^
    /tr "\"%NODE_PATH%\" \"%PROJECT_PATH%\scripts\local-automation-runner.js\" boo-stock" ^
    /sc daily /st 08:00 ^
    /ru "%USERNAME%" ^
    /f

if %errorLevel% equ 0 (
    echo      ✓ MasterOps-StockSync-AM created
) else (
    echo      ✗ Failed to create MasterOps-StockSync-AM
)

REM Task 3: Stock sync at 8:00 PM
echo [3/3] Creating MasterOps-StockSync-PM task (8:00 PM)...
schtasks /create /tn "MasterOps-StockSync-PM" ^
    /tr "\"%NODE_PATH%\" \"%PROJECT_PATH%\scripts\local-automation-runner.js\" boo-stock" ^
    /sc daily /st 20:00 ^
    /ru "%USERNAME%" ^
    /f

if %errorLevel% equ 0 (
    echo      ✓ MasterOps-StockSync-PM created
) else (
    echo      ✗ Failed to create MasterOps-StockSync-PM
)

echo.
echo ============================================
echo Setup Complete
echo ============================================
echo.
echo Tasks created:
schtasks /query /tn "MasterOps-Daily" /fo list | findstr "TaskName Status"
schtasks /query /tn "MasterOps-StockSync-AM" /fo list | findstr "TaskName Status"
schtasks /query /tn "MasterOps-StockSync-PM" /fo list | findstr "TaskName Status"

echo.
echo To view all tasks: schtasks /query /tn "MasterOps*"
echo To delete a task:  schtasks /delete /tn "MasterOps-Daily" /f
echo To run manually:   schtasks /run /tn "MasterOps-Daily"
echo.

pause
