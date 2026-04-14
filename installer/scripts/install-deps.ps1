#Requires -Version 5.1
<#
.SYNOPSIS
    install-deps.ps1 — Install Node.js, pnpm, run pnpm install + pnpm build.
    Called by the Inno Setup installer after files are extracted.
#>
param(
    [Parameter(Mandatory)][string]$InstallDir
)

$ErrorActionPreference = 'Stop'
$LogFile = "$InstallDir\installer\install-deps.log"

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts  $msg" | Tee-Object -FilePath $LogFile -Append | Write-Host
}

function Exit-Error($msg) {
    Log "ERROR: $msg"
    [System.Windows.Forms.MessageBox]::Show(
        $msg, 'Nexus Installer Error',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    exit 1
}

Add-Type -AssemblyName System.Windows.Forms
New-Item -ItemType Directory -Force -Path "$InstallDir\installer" | Out-Null

Log "=== Nexus dependency installer starting ==="
Log "Install directory: $InstallDir"

# ── 1. Check / install Node.js ───────────────────────────────────────────────
Log "Checking Node.js..."
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodeOk  = $false

if ($nodeCmd) {
    $nodeVer = & node --version 2>&1
    Log "Found Node.js: $nodeVer"
    # Require v20+
    if ($nodeVer -match 'v(\d+)' -and [int]$Matches[1] -ge 20) {
        $nodeOk = $true
    } else {
        Log "Node.js version is too old (need v20+). Will download."
    }
}

if (-not $nodeOk) {
    Log "Downloading Node.js 20 LTS..."
    $nodeMsi = "$env:TEMP\node-v20-lts-x64.msi"
    $nodeUrl  = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        Log "Installing Node.js (silent)..."
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait -NoNewWindow
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('Path','User')
        Log "Node.js installed: $(& node --version 2>&1)"
    } catch {
        Exit-Error "Failed to install Node.js automatically.`nPlease install Node.js 20+ from https://nodejs.org and re-run the installer."
    }
}

# ── 2. Check / install pnpm ──────────────────────────────────────────────────
Log "Checking pnpm..."
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue

if (-not $pnpmCmd) {
    Log "Installing pnpm via npm..."
    & npm install -g pnpm@10 2>&1 | ForEach-Object { Log $_ }
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User') + ';' +
                "$env:APPDATA\npm"
    $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
    if (-not $pnpmCmd) {
        Exit-Error "pnpm installation failed. Please install pnpm manually: npm install -g pnpm"
    }
}
Log "pnpm found: $(& pnpm --version 2>&1)"

# ── 3. pnpm install (production deps) ────────────────────────────────────────
Log "Running pnpm install..."
Set-Location $InstallDir

# Disable the packageManager corepack check so any pnpm version works
$env:COREPACK_ENABLE_STRICT = '0'

$result = & pnpm install --frozen-lockfile 2>&1
$result | ForEach-Object { Log $_ }

if ($LASTEXITCODE -ne 0) {
    Log "Frozen lockfile failed, retrying without --frozen-lockfile..."
    $result = & pnpm install 2>&1
    $result | ForEach-Object { Log $_ }
    if ($LASTEXITCODE -ne 0) {
        Exit-Error "pnpm install failed. Check $LogFile for details."
    }
}

# ── 4. pnpm build ────────────────────────────────────────────────────────────
Log "Building Nexus (vite build + esbuild)..."
$result = & pnpm run build 2>&1
$result | ForEach-Object { Log $_ }

if ($LASTEXITCODE -ne 0) {
    Exit-Error "Build failed. Check $LogFile for details."
}

Log "Build complete."

# ── 5. Run DB migration ───────────────────────────────────────────────────────
Log "Running database migration..."
$migrateScript = "$InstallDir\scripts\migrate-v4.mjs"
if (Test-Path $migrateScript) {
    $result = & node $migrateScript 2>&1
    $result | ForEach-Object { Log $_ }
    if ($LASTEXITCODE -ne 0) {
        Log "WARNING: Migration returned exit code $LASTEXITCODE — check DB connection."
    } else {
        Log "Database migration complete."
    }
} else {
    Log "WARNING: Migration script not found at $migrateScript"
}

Log "=== Dependency installation complete ==="
exit 0
