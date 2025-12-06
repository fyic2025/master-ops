@echo off
REM Quick setup script for Daily Sync automation

echo ============================================================
echo Daily Sync Setup for Master Operations
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [2/4] Initializing Git repository...
git status >nul 2>&1
if errorlevel 1 (
    echo Initializing new git repository...
    git init
    echo.
    echo IMPORTANT: You need to add a GitHub remote repository
    echo Run this command after setup:
    echo   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    echo.
) else (
    echo Git repository already initialized
)
echo.

echo [3/4] Testing the daily sync script...
python daily_sync.py
if errorlevel 1 (
    echo.
    echo WARNING: Script test failed. Check the error messages above.
    echo You may need to setup your GitHub remote first.
    echo.
) else (
    echo.
    echo Script test successful!
    echo.
)

echo [4/4] Creating Windows Task Scheduler task...
echo.
echo To complete setup, run ONE of these options:
echo.
echo OPTION A - Automated (PowerShell as Administrator):
echo   1. Open PowerShell as Administrator
echo   2. Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
echo   3. Copy and run the PowerShell command from SETUP_TASK_SCHEDULER.md
echo.
echo OPTION B - Manual (GUI):
echo   1. Press Win+R and type: taskschd.msc
echo   2. Follow the steps in SETUP_TASK_SCHEDULER.md
echo.

echo ============================================================
echo Setup Instructions
echo ============================================================
echo.
echo NEXT STEPS:
echo 1. Add GitHub remote (if not already done):
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
echo.
echo 2. Setup Task Scheduler using SETUP_TASK_SCHEDULER.md
echo.
echo 3. Test the scheduled task manually from Task Scheduler
echo.
echo For detailed instructions, see: SETUP_TASK_SCHEDULER.md
echo.

pause
