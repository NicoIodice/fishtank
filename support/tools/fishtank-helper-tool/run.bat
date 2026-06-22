@echo off
SETLOCAL
cd /d "%~dp0"

REM ── First-run bootstrap: create .venv and install deps if not present ────────
IF NOT EXIST ".venv\Scripts\python.exe" (
    echo Setting up virtual environment...
    python -m venv .venv
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment.
        echo Make sure Python 3.9+ is installed: https://www.python.org/
        pause
        exit /b 1
    )
    echo Installing dependencies...
    ".venv\Scripts\pip.exe" install -r requirements.txt
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
)

".venv\Scripts\python.exe" fishtank_tool.py %*
ENDLOCAL
pause