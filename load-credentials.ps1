# Load Credentials Helper Script for Windows PowerShell
# Usage: . .\load-credentials.ps1

$envFile = "MASTER-CREDENTIALS-COMPLETE.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: $envFile not found!" -ForegroundColor Red
    Write-Host "   Please copy .env.template to $envFile and fill in your credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔐 Loading credentials from $envFile..." -ForegroundColor Cyan

$loadedCount = 0
$skippedCount = 0

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    # Skip empty lines and comments
    if ($line -eq "" -or $line.StartsWith("#")) {
        return
    }

    # Parse KEY=VALUE
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()

        # Skip if value is empty
        if ($value -eq "") {
            $skippedCount++
            return
        }

        # Set environment variable for current process
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        $loadedCount++
        Write-Host "  ✓ Loaded: $key" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Loaded $loadedCount credentials" -ForegroundColor Green
if ($skippedCount -gt 0) {
    Write-Host "⚠️  Skipped $skippedCount empty values" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Credentials are now available for this PowerShell session" -ForegroundColor Cyan
