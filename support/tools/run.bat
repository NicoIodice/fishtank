@echo off
SETLOCAL
cd /d "%~dp0"

REM Prefer the local .venv Python so installed packages are always available.
IF EXIST ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" fishtank_tool.py %*
    GOTO :end
)

REM .venv not found — fall back to system Python (first-run or not yet set up).
where python >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    python fishtank_tool.py %*
    GOTO :end
)

REM Last resort: try via WSL.
where wsl >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    wsl python fishtank_tool.py %*
    GOTO :end
)

echo ERROR: Python not found. Install Python 3.9+ from https://www.python.org/ or enable WSL2.
pause
exit /b 1

:end
ENDLOCAL
pause