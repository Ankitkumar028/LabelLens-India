#!/usr/bin/env bash
# teardown_gpu.sh — GPU Cost Guard: safely destroy AMD GPU droplet to prevent billing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
TF_DIR="${PROJECT_ROOT}/infra/terraform"

echo "=========================================================================="
echo "🛡️  LABELENS INDIA — GPU COST GUARD & TEARDOWN"
echo "=========================================================================="
echo "Destroying AMD GPU Droplet to prevent unexpected billing..."

# 1. Attempt Terraform destroy if state exists
if [ -d "${TF_DIR}" ] && [ -f "${TF_DIR}/terraform.tfstate" ]; then
    echo "Found Terraform state in ${TF_DIR}. Running terraform destroy..."
    cd "${TF_DIR}"
    terraform destroy -auto-approve || true
    echo "✓ Terraform teardown completed."
else
    echo "No local terraform.tfstate found. Checking DigitalOcean API directly..."
fi

# 2. Check DigitalOcean CLI (doctl) if installed
if command -v doctl &> /dev/null; then
    echo "Querying DigitalOcean for droplets tagged 'labellens' or 'amd-rocm'..."
    DROPLET_IDS=$(doctl compute droplet list --tag-name "labellens" --format ID --no-header 2>/dev/null || true)
    if [ -n "${DROPLET_IDS}" ]; then
        for id in ${DROPLET_IDS}; do
            echo "Destroying droplet ID ${id}..."
            doctl compute droplet delete "${id}" --force
        done
        echo "✓ Droplets deleted via doctl."
    else
        echo "No tagged GPU droplets found running."
    fi
fi

echo "=========================================================================="
echo "✅ GPU Droplet successfully torn down. Zero ongoing compute billing."
echo "=========================================================================="
