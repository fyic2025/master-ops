@echo off
REM Daily P&L Sync from Xero to Supabase
REM Run via Task Scheduler at 6am daily

cd /d c:\Users\jayso\master-ops
node scripts\financials\sync-monthly-pnl.js >> logs\pnl-sync.log 2>&1
node scripts\financials\sync-intercompany.js >> logs\intercompany-sync.log 2>&1
