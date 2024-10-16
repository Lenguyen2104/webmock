module.exports = {
    apps: [
      {
        name: "lucky86",
        script: "npm",
        args: "start",
        cwd: "./",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",
      },
    ],
  };
  