#!/bin/sh
set -e

# Normalize VITE_API_URL for client browsers:
# If Render injected a bare service name (e.g. "labellens-api-ktax"),
# append ".onrender.com" and guarantee "https://" prefix.
RAW_API_URL="${VITE_API_URL:-}"
if [ -n "$RAW_API_URL" ]; then
  RAW_API_URL="${RAW_API_URL%/}"
  case "$RAW_API_URL" in
    *.*)
      ;;
    http*)
      ;;
    *)
      RAW_API_URL="${RAW_API_URL}.onrender.com"
      ;;
  esac
  case "$RAW_API_URL" in
    http://*|https://*)
      ;;
    *)
      RAW_API_URL="https://${RAW_API_URL}"
      ;;
  esac
fi

# Generate runtime browser environment configuration
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_URL: "${RAW_API_URL}"
};
EOF

# Extract system nameserver from /etc/resolv.conf (works across Docker Compose, Render, and Kubernetes)
SYS_RESOLVERS=$(awk 'BEGIN{ORS=" "} $1=="nameserver" {print $2}' /etc/resolv.conf 2>/dev/null)
export DNS_RESOLVER="${SYS_RESOLVERS:-127.0.0.11 8.8.8.8}"
export API_BACKEND_URL="${API_BACKEND_URL:-http://labellens-api:8000}"

if [ -f /etc/nginx/templates/default.conf.template ]; then
  envsubst '${DNS_RESOLVER} ${API_BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

exec "$@"
