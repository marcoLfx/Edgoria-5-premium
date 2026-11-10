@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 INSTALAR_EDGORIA63.py %*
) else (
  python INSTALAR_EDGORIA63.py %*
)
echo.
pause
