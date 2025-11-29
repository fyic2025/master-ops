#Requires -Version 5.1
<#
.SYNOPSIS
    Load credentials from Supabase vault into environment variables (Windows)

.DESCRIPTION
    Quick-start script for local development on Windows.
    Fetches credentials from Supabase vault and sets them as environment variables.

.PARAMETER Project
    Project to load credentials for: boo, elevate, teelixir, redhillfresh, or 'all'
    Default: all

.EXAMPLE
    . .\load-creds.ps1
    # Loads ALL credentials

.EXAMPLE
    . .\load-creds.ps1 boo
    # Loads BOO + global credentials

.NOTES
    Must be "dot-sourced" to persist in current session:
    CORRECT:   . .\load-creds.ps1
    WRONG:     .\load-creds.ps1
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('all', 'boo', 'elevate', 'teelixir', 'redhillfresh', 'global')]
    [string]$Project = 'all'
)

# Vault configuration
$SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co'
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
$ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key'

function Decrypt-Value {
    param([string]$EncryptedValue)

    try {
        $bytes = [System.Convert]::FromBase64String($EncryptedValue)
        if ($bytes.Length -lt 17) { return $null }

        $iv = $bytes[0..15]
        $encrypted = $bytes[16..($bytes.Length - 1)]

        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        $keyBytes = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($ENCRYPTION_KEY))

        $aes = [System.Security.Cryptography.Aes]::Create()
        $aes.Key = $keyBytes
        $aes.IV = $iv
        $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

        $decryptor = $aes.CreateDecryptor()
        $decrypted = $decryptor.TransformFinalBlock($encrypted, 0, $encrypted.Length)

        return [System.Text.Encoding]::UTF8.GetString($decrypted)
    }
    catch {
        return $null
    }
}

function Get-VaultCredentials {
    param([string]$ProjectFilter = $null)

    $uri = "https://$SUPABASE_HOST/rest/v1/secure_credentials?select=project,name,encrypted_value"
    if ($ProjectFilter -and $ProjectFilter -ne 'all') {
        $uri += "&project=eq.$ProjectFilter"
    }

    $headers = @{
        'apikey' = $SUPABASE_KEY
        'Authorization' = "Bearer $SUPABASE_KEY"
    }

    try {
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        return $response
    }
    catch {
        Write-Error "Failed to fetch credentials: $_"
        return @()
    }
}

function Convert-ToEnvName {
    param([string]$Project, [string]$Name)

    if ($Project -eq 'global') {
        return $Name.ToUpper()
    }
    return "$($Project.ToUpper())_$($Name.ToUpper())"
}

# Main execution
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " LOADING CREDENTIALS FROM VAULT" -ForegroundColor Cyan
if ($Project -ne 'all') {
    Write-Host " Project: $Project (+ global)" -ForegroundColor Cyan
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$loadedCount = 0
$projectsToLoad = @()

if ($Project -eq 'all') {
    $projectsToLoad = @('boo', 'elevate', 'teelixir', 'redhillfresh', 'global')
} else {
    $projectsToLoad = @($Project)
    if ($Project -ne 'global') {
        $projectsToLoad += 'global'
    }
}

foreach ($proj in $projectsToLoad) {
    $creds = Get-VaultCredentials -ProjectFilter $proj

    if ($creds.Count -gt 0) {
        Write-Host "  [$($proj.ToUpper())]" -ForegroundColor Yellow

        foreach ($cred in $creds) {
            $value = Decrypt-Value -EncryptedValue $cred.encrypted_value
            if ($value) {
                $envName = Convert-ToEnvName -Project $cred.project -Name $cred.name
                [Environment]::SetEnvironmentVariable($envName, $value, 'Process')
                Write-Host "    $envName" -ForegroundColor DarkGray
                $loadedCount++
            }
        }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " Loaded $loadedCount credentials into environment" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# Quick verification
Write-Host "Quick verify:" -ForegroundColor DarkGray
if ($env:BOO_BC_ACCESS_TOKEN) {
    $tok = $env:BOO_BC_ACCESS_TOKEN
    if ($tok.Length -ge 3) {
        Write-Host "  BOO_BC_ACCESS_TOKEN: $($tok.Substring(0,3))..." -ForegroundColor DarkGray
    }
}
if ($env:N8N_API_KEY) {
    $tok = $env:N8N_API_KEY
    if ($tok.Length -ge 3) {
        Write-Host "  N8N_API_KEY: $($tok.Substring(0,3))..." -ForegroundColor DarkGray
    }
}
Write-Host ""
