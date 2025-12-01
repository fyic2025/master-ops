@echo off
cd /d C:\Users\jayso\master-ops
node scripts\local-automation-runner.js all >> logs\daily-automation.log 2>&1
