@echo off
setlocal
chcp 65001 >nul
if "%~1"=="" (
 echo Abre GitHub Desktop - Repository - Show in Explorer y copia la ruta del repositorio.
 set /p REPO=Ruta completa a EDGORIA Premium: 
) else (
 set "REPO=%~1"
)
if not exist "%REPO%\public\app.js" (
 echo ERROR: Ruta incorrecta. No se ha modificado ningun archivo.
 pause
 exit /b 1
)
py -3 "%~dp0INSTALAR_EDGORIA_64.py" "%REPO%"
if errorlevel 1 (
 echo Error al instalar, consulta el mensaje. No hagas commit hasta revisar.
 pause
 exit /b 1
)
echo Completado: revisa los cambios en GitHub Desktop. Crea un commit en una rama Preview.
pause
