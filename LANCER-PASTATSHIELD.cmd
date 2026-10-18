@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PY=%~dp0backend\.venv\Scripts\python.exe"

if not exist "%PY%" (
  echo [PastaTshield] Python virtuel introuvable : backend\.venv
  echo Consultez README.md pour installer les dependances.
  pause
  exit /b 1
)
if not exist "frontend\dist\index.html" (
  echo [PastaTshield] Interface non compilee. Lancez npm run build dans frontend.
  pause
  exit /b 1
)
"%PY%" -c "import fastapi, uvicorn, tldextract" >nul 2>&1
if errorlevel 1 (
  echo [PastaTshield] Dependances Python manquantes.
  echo Lancez : backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  pause
  exit /b 1
)

call :verify_running
if not errorlevel 1 goto ready

echo [PastaTshield] Demarrage du serveur local...
start "PastaTshield - Serveur local" "%PY%" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000

for /L %%I in (1,1,10) do (
  timeout /t 1 /nobreak >nul
  call :verify_running
  if not errorlevel 1 goto ready
)
echo [PastaTshield] ERREUR : le serveur n'a pas demarre.
echo Consultez les messages de la fenetre serveur et le README.md.
pause
exit /b 1

:ready
start "" "http://127.0.0.1:8000/"
echo [PastaTshield] Application locale ouverte.
exit /b 0

:verify_running
powershell -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content.Contains('__PASTATSHIELD_TOKEN__')) {exit 0}; exit 1 } catch {exit 1}" >nul 2>&1
exit /b %errorlevel%
