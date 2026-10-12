FROM prom/prometheus:v2.54.1

# Embed alert rules and configuration
COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY alert_rules.yml /etc/prometheus/alert_rules.yml

EXPOSE 9090

# Health check verifies built-in /-/healthy endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=5s \
  CMD wget -q --tries=1 --spider http://127.0.0.1:9090/-/healthy || exit 1
