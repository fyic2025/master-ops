@echo off
echo Creating scheduled tasks...

schtasks /create /tn "MasterOps-Daily" /tr "C:\Users\jayso\master-ops\scripts\task-daily.cmd" /sc daily /st 09:00 /f
if %errorlevel% equ 0 (echo   [OK] MasterOps-Daily) else (echo   [FAIL] MasterOps-Daily)

schtasks /create /tn "MasterOps-StockSync-AM" /tr "C:\Users\jayso\master-ops\scripts\task-stock-sync.cmd" /sc daily /st 08:00 /f
if %errorlevel% equ 0 (echo   [OK] MasterOps-StockSync-AM) else (echo   [FAIL] MasterOps-StockSync-AM)

schtasks /create /tn "MasterOps-StockSync-PM" /tr "C:\Users\jayso\master-ops\scripts\task-stock-sync.cmd" /sc daily /st 20:00 /f
if %errorlevel% equ 0 (echo   [OK] MasterOps-StockSync-PM) else (echo   [FAIL] MasterOps-StockSync-PM)

echo.
echo Tasks created. Verify with: schtasks /query /fo list /tn MasterOps*
