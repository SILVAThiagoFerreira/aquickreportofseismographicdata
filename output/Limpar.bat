@echo off
setlocal

REM Caminho da pasta (onde o .bat está)
set "DIR=%~dp0"

echo Limpando pasta: %DIR%
echo.

REM Apaga arquivos (exceto .gitkeep e Limpar.bat)
for %%F in ("%DIR%\*") do (
    if /I not "%%~nxF"==".gitkeep" if /I not "%%~nxF"=="Limpar.bat" (
        del /F /Q "%%F" 2>nul
    )
)

REM Apaga todas as pastas
for /D %%D in ("%DIR%\*") do (
    rd /S /Q "%%D"
)

echo.
echo Limpeza concluída (mantidos: .gitkeep e Limpar.bat)
pause