; ============================================================
;  Nexus — Windows Installer Script
;  Built with Inno Setup 6.x  (https://jrsoftware.org/isinfo.php)
;
;  To compile:
;    1. Install Inno Setup 6 from https://jrsoftware.org/isdl.php
;    2. Run:  ISCC.exe installer\nexus.iss
;    3. Output: installer\Output\nexus-setup.exe
;
;  What this installer does:
;    1. Checks for Node.js 20+ (downloads if missing)
;    2. Checks for pnpm (installs via npm if missing)
;    3. Extracts app source to install dir
;    4. Runs pnpm install + pnpm build
;    5. Collects DB/env config from the user via wizard pages
;    6. Writes .env file
;    7. Runs DB migration script
;    8. Installs NSSM + registers Nexus as a Windows Service
;    9. Creates Start Menu shortcuts
; ============================================================

#define AppName      "Nexus"
#define AppVersion   "1.0.0"
#define AppPublisher "Tim Schmoyer"
#define AppURL       "https://github.com/tms2283/nexus"
#define AppExeName   "nexus-service"
#define ServiceName  "NexusApp"
#define DefaultPort  "3000"

[Setup]
AppId={{A3F7C2E1-9B4D-4F2A-8E6C-1D5B3A7F9E2C}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\Nexus
DefaultGroupName={#AppName}
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=Output
OutputBaseFilename=nexus-setup
; SetupIconFile=assets\nexus.ico  ; Uncomment after adding installer\assets\nexus.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
MinVersion=10.0.17763
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartIfNeededByRun=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "startservice"; Description: "Start Nexus service immediately after install"; GroupDescription: "Service:"
Name: "autostart";    Description: "Start Nexus automatically with Windows";        GroupDescription: "Service:"
Name: "desktopicon";  Description: "Create a &desktop shortcut";                    GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; ── App source (exclude dev artifacts) ──────────────────────────────────────
Source: "..\client\*";       DestDir: "{app}\client";       Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\server\*";       DestDir: "{app}\server";       Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\shared\*";       DestDir: "{app}\shared";       Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\drizzle\*";      DestDir: "{app}\drizzle";      Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\*";      DestDir: "{app}\scripts";      Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\patches\*";      DestDir: "{app}\patches";      Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package.json";   DestDir: "{app}";              Flags: ignoreversion
Source: "..\pnpm-lock.yaml"; DestDir: "{app}";              Flags: ignoreversion
Source: "..\tsconfig.json";  DestDir: "{app}";              Flags: ignoreversion
Source: "..\vite.config.ts"; DestDir: "{app}";              Flags: ignoreversion
Source: "..\drizzle.config.ts"; DestDir: "{app}";           Flags: ignoreversion
Source: "..\components.json"; DestDir: "{app}";             Flags: ignoreversion
Source: "..\ecosystem.config.cjs"; DestDir: "{app}";        Flags: ignoreversion
Source: "..\README.md";      DestDir: "{app}";              Flags: ignoreversion

; ── Bundled tools ─────────────────────────────────────────────────────────
; NOTE: nssm.exe is downloaded at install time by setup-service.ps1
; (https://nssm.cc — NSSM 2.24 win64)
; To pre-bundle instead: download nssm.exe to installer\tools\nssm-2.24\win64\
; and uncomment the line below:
; Source: "tools\nssm-2.24\win64\nssm.exe"; DestDir: "{app}\tools"; Flags: ignoreversion

; ── Post-install scripts ─────────────────────────────────────────────────
Source: "scripts\install-deps.ps1";  DestDir: "{app}\installer"; Flags: ignoreversion
Source: "scripts\setup-service.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "scripts\uninstall.ps1";     DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{group}\Open Nexus";          Filename: "{app}\installer\open-browser.cmd"; Comment: "Open Nexus in your browser"
Name: "{group}\Nexus Logs";          Filename: "{app}\installer\view-logs.cmd";    Comment: "View Nexus service logs"
Name: "{group}\Stop Nexus Service";  Filename: "{app}\installer\stop-service.cmd"; Comment: "Stop the Nexus service"
Name: "{group}\Start Nexus Service"; Filename: "{app}\installer\start-service.cmd"; Comment: "Start the Nexus service"
Name: "{group}\Uninstall Nexus";     Filename: "{uninstallexe}"
Name: "{autodesktop}\Nexus";         Filename: "{app}\installer\open-browser.cmd"; Tasks: desktopicon

[Registry]
Root: HKLM; Subkey: "SOFTWARE\Nexus"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "SOFTWARE\Nexus"; ValueType: string; ValueName: "Version";     ValueData: "{#AppVersion}"
Root: HKLM; Subkey: "SOFTWARE\Nexus"; ValueType: string; ValueName: "Port";        ValueData: "{code:GetPort}"

[Run]
; Step 1: Install Node.js dependencies and build
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\install-deps.ps1"" -InstallDir ""{app}"""; \
  StatusMsg: "Installing dependencies and building Nexus (this may take a few minutes)..."; \
  Flags: runhidden waituntilterminated; WorkingDir: "{app}"

; Step 2: Register as Windows Service
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\setup-service.ps1"" -InstallDir ""{app}"" -Port ""{code:GetPort}"" -StartService ""{code:GetStartService}"""; \
  StatusMsg: "Registering Nexus as a Windows service..."; \
  Flags: runhidden waituntilterminated

; Step 3: Open browser (optional, after service starts)
Filename: "cmd.exe"; Parameters: "/c timeout /t 3 /nobreak && start http://localhost:{code:GetPort}"; \
  Description: "Open Nexus in browser"; Flags: postinstall skipifsilent shellexec nowait; \
  Tasks: startservice

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\uninstall.ps1"""; \
  RunOnceId: "RemoveNexusService"; Flags: runhidden waituntilterminated

[Code]
// ── Custom wizard pages ──────────────────────────────────────────────────────
var
  DbPage:     TInputQueryWizardPage;
  EnvPage:    TInputQueryWizardPage;
  PortPage:   TInputQueryWizardPage;

procedure InitializeWizard;
begin
  // Page 1: Database configuration
  DbPage := CreateInputQueryPage(wpSelectDir,
    'Database Configuration',
    'Enter your MySQL connection details.',
    'Nexus requires MySQL 8. Enter the connection details below.'#13#10 +
    'If MySQL is not installed, the installer will guide you to download it.');
  DbPage.Add('MySQL Host (e.g. localhost):', False);
  DbPage.Add('MySQL Port (default: 3306):', False);
  DbPage.Add('MySQL Database name (e.g. nexus):', False);
  DbPage.Add('MySQL Username:', False);
  DbPage.Add('MySQL Password:', True);
  DbPage.Values[0] := 'localhost';
  DbPage.Values[1] := '3306';
  DbPage.Values[2] := 'nexus';
  DbPage.Values[3] := 'nexus_user';

  // Page 2: App configuration
  EnvPage := CreateInputQueryPage(DbPage.ID,
    'Application Settings',
    'Configure your Nexus instance.',
    'These values secure your installation. Generate random secrets as shown.');
  EnvPage.Add('JWT Secret (min 64 chars — run: node -e "console.log(require(''crypto'').randomBytes(64).toString(''hex''))"):', False);
  EnvPage.Add('Encryption Key (64 hex chars — run: openssl rand -hex 32):', False);
  EnvPage.Add('OAuth Server URL (leave blank to disable OAuth login):', False);
  EnvPage.Add('Owner OpenID (your OAuth sub claim, for admin access):', False);
  EnvPage.Values[2] := '';

  // Page 3: Port
  PortPage := CreateInputQueryPage(EnvPage.ID,
    'Server Port',
    'Choose the port Nexus will listen on.',
    'Default is 3000. Use a different port if 3000 is already in use on your machine.');
  PortPage.Add('Port number:', False);
  PortPage.Values[0] := '3000';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  JwtSecret, EncKey: String;
begin
  Result := True;

  if CurPageID = DbPage.ID then begin
    if (DbPage.Values[0] = '') or (DbPage.Values[2] = '') or
       (DbPage.Values[3] = '') then begin
      MsgBox('Please fill in all required database fields.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  if CurPageID = EnvPage.ID then begin
    JwtSecret := EnvPage.Values[0];
    EncKey    := EnvPage.Values[1];
    if Length(JwtSecret) < 32 then begin
      MsgBox('JWT Secret must be at least 32 characters. Generate one with:'#13#10 +
             'node -e "console.log(require(''crypto'').randomBytes(64).toString(''hex''))"',
             mbError, MB_OK);
      Result := False;
      Exit;
    end;
    if Length(EncKey) < 64 then begin
      MsgBox('Encryption Key must be exactly 64 hex characters (32 bytes).'#13#10 +
             'Generate one with: openssl rand -hex 32',
             mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  if CurPageID = PortPage.ID then begin
    if (StrToIntDef(PortPage.Values[0], 0) < 1) or
       (StrToIntDef(PortPage.Values[0], 0) > 65535) then begin
      MsgBox('Please enter a valid port number (1-65535).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;
end;

// ── Helper functions used in [Run] and [Icons] ───────────────────────────────
function GetPort(Param: String): String;
begin
  Result := PortPage.Values[0];
  if Result = '' then Result := '3000';
end;

function GetStartService(Param: String): String;
begin
  if WizardIsTaskSelected('startservice') then
    Result := 'true'
  else
    Result := 'false';
end;

// Write .env file before [Run] section executes
procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  DbUrl:      String;
  EnvFile:    String;
begin
  if CurStep = ssPostInstall then begin
    DbUrl := 'mysql://' + DbPage.Values[3] + ':' + DbPage.Values[4] +
             '@' + DbPage.Values[0] + ':' + DbPage.Values[1] +
             '/' + DbPage.Values[2];

    EnvContent :=
      '# Nexus Environment — generated by installer on ' + GetDateTimeString('yyyy-mm-dd', '-', ':') + #13#10 +
      'NODE_ENV=production' + #13#10 +
      'PORT=' + PortPage.Values[0] + #13#10 +
      'VITE_APP_ID=nexus' + #13#10 +
      '' + #13#10 +
      '# Database' + #13#10 +
      'DATABASE_URL=' + DbUrl + #13#10 +
      '' + #13#10 +
      '# Auth / Session' + #13#10 +
      'JWT_SECRET=' + EnvPage.Values[0] + #13#10 +
      'OWNER_OPEN_ID=' + EnvPage.Values[3] + #13#10 +
      '' + #13#10 +
      '# Encryption' + #13#10 +
      'ENCRYPTION_KEY=' + EnvPage.Values[1] + #13#10 +
      '' + #13#10 +
      '# OAuth (optional)' + #13#10 +
      'OAUTH_SERVER_URL=' + EnvPage.Values[2] + #13#10 +
      '' + #13#10 +
      '# AI providers (optional — users can supply their own keys via Settings)' + #13#10 +
      '# BUILT_IN_FORGE_API_URL=' + #13#10 +
      '# BUILT_IN_FORGE_API_KEY=' + #13#10 +
      '# ELEVENLABS_API_KEY=' + #13#10;

    EnvFile := ExpandConstant('{app}') + '\.env';
    if not SaveStringToFile(EnvFile, EnvContent, False) then
      MsgBox('Warning: Could not write .env file to ' + EnvFile +
             '. You will need to create it manually.', mbError, MB_OK);
  end;
end;
