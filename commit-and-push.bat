@echo off
REM Commit and push your changes - Windows version

echo 💾 Saving your work to GitHub...
echo.

REM Add all changes
git add .

REM Use provided message or default
if "%~1"=="" (
    set MESSAGE=Work update - %date%
) else (
    set MESSAGE=%~1
)

REM Commit
git commit -m "%MESSAGE%"

REM Push to GitHub
git push

echo.
echo ✅ All changes saved to GitHub!
echo.
echo Next time you work, run: sync.bat
pause
