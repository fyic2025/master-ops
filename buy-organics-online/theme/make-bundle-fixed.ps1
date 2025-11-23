# BigCommerce Theme Bundle Creator - FIXED for Windows
$themeName = "Cornerstone-BOO-Cust"
$bundleName = "$themeName-$(Get-Date -Format 'yyyy-MM-dd-HHmm').zip"
$tempDir = "temp_bundle_fixed"
$themeDir = "$tempDir\$themeName"

Write-Host ""
Write-Host "Creating BigCommerce Theme Bundle (FIXED)..." -ForegroundColor Cyan
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
$files = @('config.json', 'schema.json', 'schemaTranslations.json', 'Gruntfile.js', 'package.json', 'stencil.conf.js')
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
Compress-Archive -Path "$tempDir\*" -DestinationPath $bundleName -Force

Remove-Item $tempDir -Recurse -Force

$size = (Get-Item $bundleName).Length / 1MB
Write-Host ""
Write-Host "Bundle created: $bundleName" -ForegroundColor Green
Write-Host "Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
Write-Host ""
