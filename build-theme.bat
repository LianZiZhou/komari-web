@echo off
setlocal EnableDelayedExpansion

REM Komari Theme Build Script for Windows
REM This script builds the theme package locally

echo Building Komari Theme Package...

REM Function to print status messages
goto :main

:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:main
echo ======================================
echo   Komari Theme Package Builder
echo ======================================
echo.

REM Check dependencies
call :print_status "Checking dependencies..."

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    call :print_error "Node.js is not installed"
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    call :print_error "npm is not installed"
    exit /b 1
)

REM Check for tar (Windows 10+ has built-in tar that supports zip)
where tar >nul 2>nul
if %ERRORLEVEL% neq 0 (
    call :print_error "tar is not installed (required for creating zip files)"
    exit /b 1
)

call :print_success "All dependencies are available"
echo.

REM Install dependencies
call :print_status "Installing dependencies..."
call npm install
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to install dependencies"
    exit /b 1
)
call :print_success "Dependencies installed"
echo.

REM Build the project
call :print_status "Building project..."
call npm run build
if %ERRORLEVEL% neq 0 (
    call :print_error "Failed to build project"
    exit /b 1
)
call :print_success "Project built successfully"
echo.

REM Update theme configuration
call :print_status "Updating theme configuration..."

REM Get current date in YY.MM.DD format
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set month=%%a
    set day=%%b
    set year=%%c
)
REM Extract last two digits of year
set year=%year:~-2%
REM Format date
set VERSION_DATE=%year%.%month%.%day%

REM Get commit hash
for /f "tokens=*" %%i in ('git rev-parse --short HEAD 2^>nul') do set COMMIT_HASH=%%i
if "%COMMIT_HASH%"=="" (
    set COMMIT_HASH=dev
    call :print_warning "Not a git repository, using 'dev' as commit hash"
)

echo Version: %VERSION_DATE%
echo Commit: %COMMIT_HASH%
echo.

REM Verify required files
call :print_status "Verifying required files..."

set files_missing=0

if not exist "preview.png" (
    call :print_error "preview.png not found"
    set files_missing=1
)

if not exist "komari-theme.json" (
    call :print_error "komari-theme.json not found"
    set files_missing=1
)

if not exist "dist" (
    call :print_error "dist/ directory not found"
    set files_missing=1
)

if %files_missing%==1 (
    call :print_error "Some required files are missing"
    exit /b 1
)

call :print_success "All required files found!"
echo.

REM Create theme package
call :print_status "Creating theme package..."

REM Create a temporary directory for the package
if exist theme-package rd /s /q theme-package
mkdir theme-package

REM Copy required files
copy preview.png theme-package\ >nul
copy komari-theme.json theme-package\ >nul
xcopy /s /e /i dist theme-package\dist >nul

REM Create zip file with version and commit hash
set ZIP_NAME=komari-theme-v%VERSION_DATE%-%COMMIT_HASH%.zip

REM Create zip using tar (available in Windows 10+)
cd theme-package
tar -a -cf "..\dist\%ZIP_NAME%" *
cd ..

REM Clean up
rd /s /q theme-package

call :print_success "Created package: %ZIP_NAME%"
dir "dist\%ZIP_NAME%"
echo.

call :print_success "Theme package build completed! 🎉"
echo.
echo You can now use the generated zip file as a theme package.

endlocal
