# BigCommerce Theme Bundle Creator - v6.17.0 with Stage 2 Optimizations
$themeName = "Cornerstone-BOO-Cust-Stage2"
$bundleName = "$themeName-6.17.0-$(Get-Date -Format 'yyyy-MM-dd').zip"
$tempDir = "temp_bundle"
$themeDir = "$tempDir\$themeName"

Write-Host ""
Write-Host "Creating BigCommerce Theme Bundle v6.17.0 with Stage 2..." -ForegroundColor Cyan
Write-Host ""

# Clean up
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $themeDir -Force | Out-Null

# Use robocopy for proper recursive copying
Write-Host "Copying theme files with robocopy..." -ForegroundColor Yellow

# Copy directories with all subdirectories
$dirs = @('meta', 'templates', 'assets', 'lang')
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        if ($dir -eq 'assets') {
            # Copy assets but exclude dist
            robocopy $dir "$themeDir\$dir" /E /XD dist /NFL /NDL /NJH /NJS | Out-Null
            Write-Host "  OK $dir (excluded dist/)" -ForegroundColor Green
        } else {
            robocopy $dir "$themeDir\$dir" /E /NFL /NDL /NJH /NJS | Out-Null
            Write-Host "  OK $dir" -ForegroundColor Green
        }
    }
}

# Copy individual files
$files = @('config.json', 'manifest.json', 'schema.json', 'schemaTranslations.json', 'Gruntfile.js', 'package.json', 'stencil.conf.cjs')
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file $themeDir -Force
        Write-Host "  OK $file" -ForegroundColor Green
    }
}

# Copy webpack files
Get-ChildItem -Filter "webpack.*.js" | ForEach-Object {
    Copy-Item $_.FullName $themeDir -Force
    Write-Host "  OK $($_.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Creating ZIP..." -ForegroundColor Yellow
# Compress from themeDir so files are at ZIP root, not in subfolder
Compress-Archive -Path "$themeDir\*" -DestinationPath $bundleName -Force

Remove-Item $tempDir -Recurse -Force

$size = (Get-Item $bundleName).Length / 1MB
Write-Host ""
Write-Host "Bundle created: $bundleName" -ForegroundColor Green
Write-Host "Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Stage 2 Optimizations Included:" -ForegroundColor Yellow
Write-Host "  - Custom CSS (31 !important removed)" -ForegroundColor Green
Write-Host "  - Resource hints in base.html" -ForegroundColor Green
Write-Host "  - Conditional infinite scroll" -ForegroundColor Green
Write-Host "  - Debug code removed from brands.html" -ForegroundColor Green
Write-Host ""
