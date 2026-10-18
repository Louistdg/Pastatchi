@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  echo [PastaTshield] L'environnement Python n'est pas installe.
  echo Consultez le README.md pour l'installation.
  pause
  exit /b 1
)
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2; if($r.Content -match 'PastaTshield'){exit 0}else{exit 1} } catch {exit 1}"
if errorlevel 1 (
  start "PastaTshield - Serveur local" /min "%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
  timeout /t 3 /nobreak >nul
)
start "" "http://127.0.0.1:8000/"
echo [PastaTshield] Navigateur ouvert. Serveur disponible en local si demarrage reussi.
endlocal
