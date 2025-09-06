# Windows Build Scripts for Komari Theme

This directory contains Windows versions of the theme build script.

## Available Scripts

### 1. build-theme.bat (Batch Script)
- **Compatibility**: Works on all Windows versions
- **Requirements**: Windows 10+ (for built-in tar command)
- **Usage**: Double-click or run in Command Prompt
```cmd
build-theme.bat
```

### 2. build-theme.ps1 (PowerShell Script)
- **Compatibility**: Windows PowerShell 5.0+ or PowerShell Core
- **Requirements**: May need to enable script execution
- **Usage**: Run in PowerShell
```powershell
# If you get execution policy error, run this first (as Administrator):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the script:
.\build-theme.ps1
```

## Prerequisites

Both scripts require:
- **Node.js** and **npm** installed
- **Git** (optional, for commit hash in version)
- Project dependencies (`package.json` must exist)

## What the Scripts Do

1. Check for required dependencies (Node.js, npm)
2. Install project dependencies (`npm install`)
3. Build the project (`npm run build`)
4. Verify required files exist:
   - `preview.png`
   - `komari-theme.json`
   - `dist/` directory
5. Create a timestamped zip package with format: `komari-theme-vYY.MM.DD-{commit}.zip`

## Output

The scripts will create a zip file in the `dist/` directory containing:
- `preview.png`
- `komari-theme.json`
- `dist/` folder with all built files

## Troubleshooting

### Batch Script Issues
- If you get "tar is not recognized", you need Windows 10 or later
- Alternative: Install 7-Zip and modify the script to use it

### PowerShell Script Issues
- If you get "cannot be loaded because running scripts is disabled", see the usage section above
- For older PowerShell versions, the zip creation might fail - use the batch script instead

## Differences from Linux Script

Both Windows scripts provide the same functionality as the original `build-theme.sh`:
- Colored output (PowerShell only, batch uses plain text)
- Dependency checking
- Error handling
- Version and commit hash in filename
- All required files verification

Choose the script that works best for your Windows environment!
