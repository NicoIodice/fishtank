# Fishtank Support Tool — PowerShell launcher
# Runs the tool from any directory.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir
try {
    # Activate venv if it exists
    $venvActivate = Join-Path $scriptDir ".venv\Scripts\Activate.ps1"
    if (Test-Path $venvActivate) {
        . $venvActivate
    }

    # Prefer native Python; fall back to WSL
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python fishtank_tool.py @args
    } elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl python fishtank_tool.py @args
    } else {
        Write-Error "Python not found natively and WSL is not available. Install Python 3.9+ or enable WSL2."
        exit 1
    }
} finally {
    Pop-Location
}
