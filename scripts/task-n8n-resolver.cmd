@echo off
REM ============================================================================
REM Daily n8n Issue Resolver - Windows Task Scheduler Trigger
REM ============================================================================
REM
REM This script is triggered by Windows Task Scheduler at login.
REM It runs the n8n issue resolver and logs output.
REM
REM To configure in Task Scheduler:
REM   1. Open Task Scheduler (taskschd.msc)
REM   2. Create Basic Task: "N8N Daily Issue Resolver"
REM   3. Trigger: "When I log on" with 2-minute delay
REM   4. Action: Start a program
REM      - Program: cmd.exe
REM      - Arguments: /c "C:\Users\jayso\master-ops\scripts\task-n8n-resolver.cmd"
REM      - Start in: C:\Users\jayso\master-ops
REM
REM Or run this to create the task:
REM   schtasks /create /tn "MasterOps-N8N-Resolver" /tr "C:\Users\jayso\master-ops\scripts\task-n8n-resolver.cmd" /sc onlogon /delay 0002:00 /f
REM
REM ============================================================================

REM Change to project directory
cd /d C:\Users\jayso\master-ops

REM Create log directory if not exists
if not exist "logs\n8n-resolver" mkdir "logs\n8n-resolver"

REM Set date for log file (YYYY-MM-DD format)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set LOGDATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%
set LOGFILE=logs\n8n-resolver\%LOGDATE%.log

REM Log header
echo ========================================== >> %LOGFILE%
echo N8N Daily Resolver - %date% %time% >> %LOGFILE%
echo ========================================== >> %LOGFILE%

REM Run the resolver
echo Running n8n daily resolver...
npx tsx scripts/daily-n8n-resolver.ts >> %LOGFILE% 2>&1

REM Log completion
echo Completed at %time% >> %LOGFILE%
echo. >> %LOGFILE%

REM Keep console open briefly to show completion (optional)
echo.
echo n8n Daily Resolver completed. Check logs\n8n-resolver\%LOGDATE%.log for details.
timeout /t 5 /nobreak > nul
