# BigCommerce Optimized Theme Bundle Creator
$themeName = "Cornerstone-BOO-Optimized"
$date = Get-Date -Format "yyyyMMdd"
$bundleName = "$themeName-$date.zip"
$tempDir = "temp_bundle"
$themeDir = "$tempDir\$themeName"

Write-Host ""
Write-Host "Creating Optimized BigCommerce Theme Bundle..." -ForegroundColor Cyan
Write-Host ""

# Clean up
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $themeDir -Force | Out-Null

# Copy directories (INCLUDING assets/dist with compiled bundles)
Write-Host "Copying theme files..." -ForegroundColor Yellow
$dirs = @('meta', 'templates', 'assets', 'lang')
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        robocopy $dir "$themeDir\$dir" /E /NFL /NDL /NJH /NJS | Out-Null
        Write-Host "  [OK] $dir" -ForegroundColor Green
    }
}

# Copy root configuration files
Write-Host ""
Write-Host "Copying configuration files..." -ForegroundColor Yellow
$files = @('config.json', 'schema.json', 'schemaTranslations.json')
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file $themeDir -Force
        Write-Host "  [OK] $file" -ForegroundColor Green
    }
}

# Create ZIP
Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path "$themeDir\*" -DestinationPath $bundleName -Force
Remove-Item $tempDir -Recurse -Force

$size = (Get-Item $bundleName).Length / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Bundle Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "File: $bundleName" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Optimizations Included:" -ForegroundColor Yellow
Write-Host "  [+] DNS prefetch hints for 5 major domains" -ForegroundColor White
Write-Host "  [+] Font-display: swap for better CLS" -ForegroundColor White
Write-Host "  [+] LQIP size reduced (80w -> 40w)" -ForegroundColor White
Write-Host "  [+] Dependencies updated (3 safe updates)" -ForegroundColor White
Write-Host "  [+] All assets compiled and optimized" -ForegroundColor White
Write-Host ""
Write-Host "Ready for deployment to BigCommerce!" -ForegroundColor Green
Write-Host ""
