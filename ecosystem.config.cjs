// ecosystem.config.cjs — PM2 process manager configuration for Nexus
// Usage: pm2 start ecosystem.config.cjs --env production
// Reload:  pm2 reload nexus --update-env
// Logs:    pm2 logs nexus

module.exports = {
  apps: [
    {
      name: "nexus",
      script: "dist/index.js",
      interpreter: "node",
      cwd: "/var/www/nexus",

      // ─── Environment ───────────────────────────────────────────────────
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // ─── Clustering (use 1 for predictable in-memory rate limiter) ────
      instances: 1,
      exec_mode: "fork",

      // ─── Stability ─────────────────────────────────────────────────────
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      autorestart: true,

      // ─── Logging ───────────────────────────────────────────────────────
      out_file: "/var/log/nexus/out.log",
      error_file: "/var/log/nexus/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // ─── Watch (disabled in production — deploy restarts manually) ────
      watch: false,

      // ─── Memory limit (restart if exceeded) ───────────────────────────
      max_memory_restart: "512M",
    },
  ],
};
