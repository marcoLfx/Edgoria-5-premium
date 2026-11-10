@echo off
chcp 65001 >nul
echo EDGORIA 5.6 - ACTUALIZACION SEGURA
set /p ruta=Ruta completa de la carpeta de tu repositorio EDGORIA: 
py "%~dp0instalar_edgoria56.py" "%ruta%"
if errorlevel 1 echo No se aplicaron cambios. Lee el error de arriba.
pause
