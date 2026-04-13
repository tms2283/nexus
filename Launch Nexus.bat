@echo off
setlocal EnableDelayedExpansion
title Nexus

set "APP_DIR=L:\Website\MANUS2"
set "PORT=3000"
set "LOG=%APP_DIR%\nexus-launcher.log"
set "DB_NAME=nexus"
set "DB_USER=nexus_user"
set "DB_PASS=nexus_local_pw"
set "DB_PORT=3306"

echo. > "%LOG%"
echo [%date% %time%] === Nexus Launcher === >> "%LOG%"

cd /d "%APP_DIR%"

:: ── 1. Check Node.js 20+ ─────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 goto :install_node
for /f "tokens=1 delims=." %%v in ('node -e "process.stdout.write(process.version.slice(1))"') do set "NODE_MAJOR=%%v"
if %NODE_MAJOR% LSS 20 goto :install_node
goto :node_ok

:install_node
echo Node.js 20+ required. Installing via winget...
winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements >nul 2>&1
:: Refresh PATH
for /f "delims=" %%p in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"Path\",\"Machine\")"') do set "PATH=%%p;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not install Node.js automatically.
    echo Please install from https://nodejs.org and try again.
    pause & exit /b 1
)
:node_ok

:: ── 2. Check / install pnpm ──────────────────────────────────
where pnpm >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm...
    call npm install -g pnpm >nul 2>&1
    set "PATH=%APPDATA%\npm;%PATH%"
)

:: ── 3. Check / install + start MySQL ─────────────────────────
sc query MySQL80 >nul 2>&1
if not errorlevel 1 goto :mysql_running
sc query MySQL >nul 2>&1
if not errorlevel 1 goto :mysql_running
sc query MariaDB >nul 2>&1
if not errorlevel 1 goto :mysql_running

echo MySQL not found. Installing MySQL 8 via winget (one-time, ~2 min)...
winget install Oracle.MySQL --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
timeout /t 10 /nobreak >nul
:: Start the service
for %%s in (MySQL80 MySQL) do (
    sc start %%s >nul 2>&1
)
timeout /t 5 /nobreak >nul

:mysql_running

:: ── 4. Create DB + user if .env doesn't exist ────────────────
if not exist ".env" (
    echo First run — setting up database and secrets...
    call :setup_db
    call :write_env
)

:: ── 5. Install node_modules if missing ───────────────────────
if not exist "node_modules" (
    echo Installing packages — first run takes ~2 minutes...
    set COREPACK_ENABLE_STRICT=0
    call pnpm install >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo ERROR: pnpm install failed. See nexus-launcher.log
        pause & exit /b 1
    )
)

:: ── 6. Build if dist is missing ──────────────────────────────
if not exist "dist\index.js" (
    echo Building Nexus — about 30 seconds...
    call pnpm run build >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo ERROR: Build failed. See nexus-launcher.log
        pause & exit /b 1
    )
)

:: ── 7. Migrate DB (idempotent) ────────────────────────────────
call node scripts\migrate-v4.mjs >> "%LOG%" 2>&1

:: ── 8. Kill any old process on this port ─────────────────────
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT% "') do (
    taskkill /PID %%p /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: ── 9. Launch server ─────────────────────────────────────────
echo [%date% %time%] Starting server... >> "%LOG%"
start /b "" node dist\index.js >> "%LOG%" 2>&1

:: ── 10. Wait for ready ────────────────────────────────────────
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
curl -s --max-time 1 http://localhost:%PORT%/ >nul 2>&1
if not errorlevel 1 goto :open
set /a tries+=1
if %tries% lss 20 goto :wait

:open
start http://localhost:%PORT%/
echo [%date% %time%] Launched. >> "%LOG%"
exit /b 0

:: ──────────────────────────────────────────────────────────────
:setup_db
echo Creating MySQL database and user...
for %%m in (
    "mysql -u root -e \"CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4;\""
    "mysql -u root -e \"CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASS%';\""
    "mysql -u root -e \"GRANT ALL ON %DB_NAME%.* TO '%DB_USER%'@'localhost'; FLUSH PRIVILEGES;\""
) do mysql -u root --connect-expired-password -e %%~m >nul 2>&1
goto :eof

:write_env
for /f %%i in ('node -e "process.stdout.write(require('crypto').randomBytes(64).toString('hex'))"') do set "JWT=%%i"
for /f %%i in ('node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"') do set "ENC=%%i"
(
echo NODE_ENV=production
echo PORT=%PORT%
echo VITE_APP_ID=nexus
echo DATABASE_URL=mysql://%DB_USER%:%DB_PASS%@localhost:%DB_PORT%/%DB_NAME%
echo JWT_SECRET=!JWT!
echo ENCRYPTION_KEY=!ENC!
echo OAUTH_SERVER_URL=
echo OWNER_OPEN_ID=
) > ".env"
echo [%date% %time%] .env written >> "%LOG%"
goto :eof
