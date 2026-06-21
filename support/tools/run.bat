@echo off
SETLOCAL
cd /d "%~dp0"

REM Check if Python is available natively first; fall back to WSL.
where python >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    python fishtank_tool.py %*
) ELSE (
    REM Python not on PATH — try via WSL
    where wsl >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        wsl python fishtank_tool.py %*
    ) ELSE (
        echo ERROR: Python not found natively and WSL is not available.
        echo Install Python 3.9+ from https://www.python.org/ or enable WSL2 and try again.
        pause
        exit /b 1
    )
)
ENDLOCAL
