#!/bin/sh
set -e

# Target host to scrape (Render live API or local)
API_TARGET="${API_METRICS_HOST:-labellens-api-ktax.onrender.com}"
SCHEME="${API_METRICS_SCHEME:-https}"

echo "Configuring Prometheus to scrape ${SCHEME}://${API_TARGET}/metrics..."

cat <<EOF > /etc/prometheus/prometheus.yml
global:
  scrape_interval: 10s
  evaluation_interval: 10s

rule_files:
  - "/etc/prometheus/alert_rules.yml"

scrape_configs:
  - job_name: "labellens-api"
    metrics_path: "/metrics"
    scheme: "${SCHEME}"
    scrape_interval: 5s
    static_configs:
      - targets: ["${API_TARGET}"]
        labels:
          service: "labellens-api"
          env: "production"

  - job_name: "prometheus"
    static_configs:
      - targets: ["127.0.0.1:9090"]
EOF

echo "Starting embedded Prometheus on 127.0.0.1:9090..."
/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.listen-address="127.0.0.1:9090" &

sleep 2

# Grafana port configuration for Render
export GF_SERVER_HTTP_PORT="${PORT:-3000}"
export PROMETHEUS_URL="http://127.0.0.1:9090"

echo "Starting Grafana on port ${GF_SERVER_HTTP_PORT}..."
exec /run.sh
