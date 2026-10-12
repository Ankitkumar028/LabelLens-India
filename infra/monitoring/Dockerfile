FROM prom/prometheus:v2.54.1 AS prom-bin

FROM grafana/grafana:11.2.0

USER root

# Copy Prometheus binary and tools from official Prometheus image
COPY --from=prom-bin /bin/prometheus /usr/local/bin/prometheus
COPY --from=prom-bin /bin/promtool /usr/local/bin/promtool

# Setup directories, copy configs and set ownership
RUN mkdir -p /etc/prometheus /prometheus /var/lib/grafana
COPY prometheus/alert_rules.yml /etc/prometheus/alert_rules.yml
COPY prometheus/prometheus.yml /etc/prometheus/prometheus.yml
COPY grafana/provisioning /etc/grafana/provisioning
COPY grafana/dashboards /etc/grafana/dashboards
COPY start-monitoring.sh /start-monitoring.sh

RUN chmod +x /start-monitoring.sh && \
    chown -R grafana:root /etc/prometheus /prometheus /var/lib/grafana /etc/grafana && \
    chmod -R 775 /etc/prometheus /prometheus

USER grafana

EXPOSE 3000 10000

ENV GF_SECURITY_ADMIN_USER=admin \
    GF_SECURITY_ADMIN_PASSWORD=admin \
    GF_USERS_ALLOW_SIGN_UP=false \
    GF_AUTH_ANONYMOUS_ENABLED=true \
    GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
    API_METRICS_HOST=labellens-api-ktax.onrender.com \
    API_METRICS_SCHEME=https

ENTRYPOINT ["/start-monitoring.sh"]
