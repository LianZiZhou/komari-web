# Komari Theme Build Script for Windows (PowerShell)
# This script builds the theme package locally

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Color functions
function Write-Status {
    param([string]$message)
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$message)
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$message)
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$message)
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check dependencies
function Check-Dependencies {
    Write-Status "Checking dependencies..."
    
    $missing = @()
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "Node.js"
    }
    
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        $missing += "npm"
    }
    
    if ($missing.Count -gt 0) {
        Write-Error "The following dependencies are missing: $($missing -join ', ')"
        exit 1
    }
    
    Write-Success "All dependencies are available"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing dependencies..."
    try {
        npm install
        Write-Success "Dependencies installed"
    } catch {
        Write-Error "Failed to install dependencies: $_"
        exit 1
    }
}

# Build project
function Build-Project {
    Write-Status "Building project..."
    try {
        npm run build
        Write-Success "Project built successfully"
    } catch {
        Write-Error "Failed to build project: $_"
        exit 1
    }
}

# Update theme configuration
function Update-ThemeConfig {
    Write-Status "Updating theme configuration..."
    
    # Get current date in YY.MM.DD format
    $versionDate = Get-Date -Format "yy.MM.dd"
    
    # Get commit hash
    try {
        $commitHash = git rev-parse --short HEAD 2>$null
        if (!$commitHash) {
            throw
        }
    } catch {
        $commitHash = "dev"
        Write-Warning "Not a git repository, using 'dev' as commit hash"
    }
    
    Write-Host "Version: $versionDate"
    Write-Host "Commit: $commitHash"
    
    return @{
        Version = $versionDate
        Commit = $commitHash
    }
}

# Verify required files
function Verify-Files {
    Write-Status "Verifying required files..."
    
    $missingFiles = @()
    
    if (!(Test-Path "preview.png")) {
        $missingFiles += "preview.png"
    }
    
    if (!(Test-Path "komari-theme.json")) {
        $missingFiles += "komari-theme.json"
    }
    
    if (!(Test-Path "dist")) {
        $missingFiles += "dist/"
    }
    
    if ($missingFiles.Count -gt 0) {
        foreach ($file in $missingFiles) {
            Write-Error "$file not found"
        }
        Write-Error "Some required files are missing"
        exit 1
    }
    
    Write-Success "All required files found!"
}

# Create theme package
function Create-Package {
    param($versionInfo)
    
    Write-Status "Creating theme package..."
    
    # Create temporary directory
    if (Test-Path "theme-package") {
        Remove-Item -Path "theme-package" -Recurse -Force
    }
    New-Item -ItemType Directory -Path "theme-package" | Out-Null
    
    # Copy required files
    Copy-Item "preview.png" "theme-package\"
    Copy-Item "komari-theme.json" "theme-package\"
    Copy-Item -Path "dist" -Destination "theme-package\" -Recurse
    
    # Create zip file
    $zipName = "komari-theme-v$($versionInfo.Version)-$($versionInfo.Commit).zip"
    $zipPath = Join-Path "dist" $zipName
    
    # Compress using built-in PowerShell cmdlet
    try {
        # For PowerShell 5.0+
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            (Resolve-Path "theme-package").Path,
            (Resolve-Path "dist").Path + "\$zipName"
        )
    } catch {
        # Fallback to Compress-Archive for newer PowerShell versions
        Compress-Archive -Path "theme-package\*" -DestinationPath $zipPath -Force
    }
    
    # Clean up
    Remove-Item -Path "theme-package" -Recurse -Force
    
    Write-Success "Created package: $zipName"
    Get-Item $zipPath | Format-Table Name, Length, LastWriteTime
}

# Main execution
function Main {
    Write-Host "======================================"
    Write-Host "  Komari Theme Package Builder"
    Write-Host "======================================"
    Write-Host ""
    
    Check-Dependencies
    Write-Host ""
    
    Install-Dependencies
    Write-Host ""
    
    Build-Project
    Write-Host ""
    
    $versionInfo = Update-ThemeConfig
    Write-Host ""
    
    Verify-Files
    Write-Host ""
    
    Create-Package -versionInfo $versionInfo
    Write-Host ""
    
    Write-Success "Theme package build completed! 🎉"
    Write-Host ""
    Write-Host "You can now use the generated zip file as a theme package."
}

# Run main function
Main
