# Nexus — Windows Installer

This directory contains everything needed to build a Windows `.exe` installer for Nexus.

## What the installer does

1. **Checks prerequisites** — detects Node.js 20+ and pnpm; downloads/installs them if missing
2. **Collects configuration** — wizard pages ask for:
   - MySQL connection details (host, port, database, user, password)
   - JWT secret and encryption key
   - OAuth server URL (optional)
   - Port number (default: 3000)
3. **Extracts app source** to `C:\Program Files\Nexus` (or user-chosen directory)
4. **Installs dependencies** — runs `pnpm install --frozen-lockfile`
5. **Builds the app** — runs `pnpm build` (Vite + esbuild)
6. **Writes `.env`** from the wizard values
7. **Runs DB migration** — `node scripts/migrate-v4.mjs`
8. **Registers a Windows Service** via [NSSM](https://nssm.cc) so Nexus starts automatically with Windows
9. **Creates Start Menu shortcuts** — Open, Logs, Start, Stop, Uninstall

## Prerequisites to build the installer

- **Windows 10/11** (64-bit)
- **[Inno Setup 6](https://jrsoftware.org/isdl.php)** — the compiler that produces the `.exe`
- **Internet access** (to download NSSM the first time)

## How to build

```powershell
# From the repo root:
.\installer\build-installer.ps1
```

This will:
1. Download NSSM 2.24 into `installer\tools\` (first run only)
2. Create a `LICENSE` file if missing
3. Compile `nexus.iss` with Inno Setup
4. Output `installer\Output\nexus-setup.exe`

## Directory structure

```
installer/
├── nexus.iss               ← Main Inno Setup script (defines installer behavior)
├── build-installer.ps1     ← Build script (run this)
├── scripts/
│   ├── install-deps.ps1    ← Downloads Node.js, runs pnpm install + build
│   ├── setup-service.ps1   ← Registers/starts Nexus as Windows Service via NSSM
│   └── uninstall.ps1       ← Cleans up service on uninstall
├── assets/
│   └── nexus.ico           ← (optional) Custom installer icon — 256×256 ICO format
└── tools/
    └── nssm-2.24/          ← Downloaded automatically by build-installer.ps1
        └── win64/
            └── nssm.exe
```

## Adding a custom icon

Place a 256×256 `.ico` file at `installer\assets\nexus.ico` before building.
If no icon is provided, the installer will use the default Inno Setup icon.

## Requirements on the end-user's machine

- Windows 10 1809+ or Windows 11 (64-bit)
- MySQL 8 running locally or accessible on the network
- Internet access during install (to download Node.js 20 LTS if not present)
- Administrator privileges (needed to register a Windows Service)

## After installation

- Nexus runs as the **NexusApp** Windows Service
- Starts automatically with Windows
- Accessible at `http://localhost:3000` (or chosen port)
- Logs: `C:\Program Files\Nexus\logs\nexus-out.log`
- Config: `C:\Program Files\Nexus\.env`

## Managing the service manually

```cmd
# Start
sc start NexusApp

# Stop
sc stop NexusApp

# View status
sc query NexusApp

# View logs
type "C:\Program Files\Nexus\logs\nexus-out.log"
```

Or use the Start Menu shortcuts installed with Nexus.

## Uninstalling

Use **Add or Remove Programs** → **Nexus**, or the **Uninstall Nexus** Start Menu shortcut.
The `.env` file and database are **not deleted** on uninstall — your data is preserved.
