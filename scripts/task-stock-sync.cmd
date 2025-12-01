@echo off
cd /d C:\Users\jayso\master-ops
node scripts\local-automation-runner.js boo-stock >> logs\stock-sync.log 2>&1
