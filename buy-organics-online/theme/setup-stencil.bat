@echo off
REM Setup BigCommerce Stencil CLI and dependencies
REM This script installs everything needed for theme development and deployment

echo ========================================
echo BigCommerce Stencil Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

echo [2/5] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    exit /b 1
)
echo.

echo [3/5] Installing Stencil CLI globally (optional but recommended)...
call npm install -g @bigcommerce/stencil-cli
if %errorlevel% neq 0 (
    echo WARNING: Global install failed, will use npx instead
)
echo.

echo [4/5] Building theme...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    exit /b 1
)
echo.

echo [5/5] Checking if .stencil config exists...
if exist .stencil (
    echo ✓ .stencil configuration found
) else (
    echo WARNING: .stencil not found!
    echo.
    echo To initialize Stencil CLI, run:
    echo   npx @bigcommerce/stencil-cli init
    echo.
    echo You will need:
    echo   - Store URL: https://store-hhhi.mybigcommerce.com
    echo   - Access Token: (from .stencil file or BigCommerce store)
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Available commands:
echo   node deploy.js --validate     - Run validation tests
echo   node deploy.js --preview      - Deploy to preview
echo   node deploy.js --production   - Deploy to production
echo.
echo   npx stencil start             - Start local development server
echo   npx stencil bundle            - Create theme bundle
echo   npx stencil push              - Upload to BigCommerce
echo.

pause
