module.exports = {
  apps: [
    {
      name: "brightboard",
      script: "dist/index.cjs",
      cwd: "/var/www/brightboardapp.com",
      node_args: "--env-file=.env --max-old-space-size=280",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      restart_delay: 5000,
      max_restarts: 99,
      min_uptime: "10s",
      exp_backoff_restart_delay: 100,
      watch: false,
      out_file: "/var/log/brightboard/out.log",
      error_file: "/var/log/brightboard/err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
