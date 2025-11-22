@echo off
REM Simple sync script for Windows - Run this at start of work

echo 🔄 Syncing with GitHub...
echo.

REM Pull latest changes
echo 📥 Getting latest from GitHub...
git pull --rebase

echo.
echo 📊 Current status:
git status

echo.
echo ✅ Sync complete!
echo.
echo When done working, run: commit-and-push.bat
pause
