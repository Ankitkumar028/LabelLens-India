FROM grafana/grafana:11.2.0

# Copy datasource & dashboard provisioning configs
COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards

EXPOSE 3000

# Health check verifies built-in /api/health endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=5s \
  CMD wget -q --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
