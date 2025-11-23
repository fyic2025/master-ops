# BigCommerce Theme Bundle Creator
$themeName = "Cornerstone-BOO-Cust"
$bundleName = "$themeName-$(Get-Date -Format 'yyyy-MM-dd').zip"
$tempDir = "temp_bundle"
$themeDir = "$tempDir\$themeName"

Write-Host ""
Write-Host "Creating BigCommerce Theme Bundle..." -ForegroundColor Cyan
Write-Host ""

# Clean up
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $themeDir -Force | Out-Null

# Required files
$required = @(
    'config.json',
    'schema.json',
    'schemaTranslations.json',
    'meta',
    'templates',
    'assets',
    'lang',
    'Gruntfile.js',
    'package.json',
    'stencil.conf.js'
)

Write-Host "Copying theme files..." -ForegroundColor Yellow
foreach ($item in $required) {
    if (Test-Path $item) {
        if ($item -eq 'assets') {
            # Copy assets but exclude the dist folder (compiled files)
            Copy-Item $item $themeDir -Recurse -Force
            if (Test-Path "$themeDir\assets\dist") {
                Remove-Item "$themeDir\assets\dist" -Recurse -Force
                Write-Host "  OK $item (excluded dist/)" -ForegroundColor Green
            } else {
                Write-Host "  OK $item" -ForegroundColor Green
            }
        } else {
            Copy-Item $item $themeDir -Recurse -Force
            Write-Host "  OK $item" -ForegroundColor Green
        }
    }
}

# Copy webpack files
Get-ChildItem -Filter "webpack.*.js" -ErrorAction SilentlyContinue | ForEach-Object {
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
