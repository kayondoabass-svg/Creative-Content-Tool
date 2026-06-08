module.exports = {
  apps: [
    {
      name: "brightboard",
      script: "dist/index.cjs",
      cwd: "/var/www/brightboardapp.com",
      node_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "700M",
      restart_delay: 3000,
      max_restarts: 15,
      watch: false,
      out_file: "/var/log/brightboard/out.log",
      error_file: "/var/log/brightboard/err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
