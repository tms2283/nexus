/**
 * validateEnv.ts — Startup environment validation.
 *
 * Called at the very top of server/_core/index.ts before anything else.
 * Fails fast with a clear message rather than crashing mysteriously later.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  generateHint?: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "MySQL connection string",
    generateHint: "mysql://user:password@localhost:3306/nexus",
  },
  {
    name: "JWT_SECRET",
    required: true,
    description: "Session signing secret (≥64 chars)",
    generateHint: "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  },
  {
    name: "ENCRYPTION_KEY",
    required: true,
    description: "AES-256-GCM key for encrypting user API keys (64 hex chars)",
    generateHint: "openssl rand -hex 32",
  },
];

export function validateEnv(): void {
  const missing: EnvVar[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    if (!value || value.trim() === "") {
      if (envVar.required) {
        missing.push(envVar);
      }
    }
  }

  // Warn if JWT_SECRET looks too short
  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (jwtSecret && jwtSecret.length < 32) {
    warnings.push("JWT_SECRET is shorter than 32 characters — use at least 64 random chars in production.");
  }

  // Warn if ENCRYPTION_KEY looks like the placeholder
  const encKey = process.env.ENCRYPTION_KEY ?? "";
  if (encKey && encKey.includes("generate_a_64_char") ) {
    warnings.push("ENCRYPTION_KEY appears to be the placeholder from .env.example — generate a real key.");
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`[env] ⚠️  ${w}`);
    }
  }

  if (missing.length > 0) {
    console.error("\n[env] ❌ Server cannot start — required environment variables are missing:\n");
    for (const v of missing) {
      console.error(`  ${v.name}`);
      console.error(`    Description: ${v.description}`);
      if (v.generateHint) {
        console.error(`    Generate:    ${v.generateHint}`);
      }
      console.error("");
    }
    console.error("  Copy .env.example to .env and fill in the missing values.\n");
    process.exit(1);
  }

  console.log("[env] ✓ Environment validation passed");
}
