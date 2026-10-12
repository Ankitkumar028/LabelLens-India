#!/usr/bin/env bash
# run_vllm_rocm.sh — Launch vLLM server with ROCm on AMD GPU droplet

set -euo pipefail

MODEL_NAME="${MODEL_NAME:-Qwen/Qwen2.5-VL-7B-Instruct}"
PORT="${PORT:-8000}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-4096}"

echo "================================================================="
echo "Starting ROCm vLLM Server on AMD GPU droplet"
echo "Model: ${MODEL_NAME}"
echo "Port: ${PORT}"
echo "================================================================="

# Check ROCm hardware devices
if [ -e /dev/kfd ] && [ -e /dev/dri ]; then
    echo "✓ ROCm kernel device nodes /dev/kfd and /dev/dri detected."
else
    echo "⚠ Warning: /dev/kfd or /dev/dri not found! Verify AMD GPU driver installation."
fi

# Run docker container
docker run -d \
    --name labellens-vllm-rocm \
    --restart unless-stopped \
    --device=/dev/kfd \
    --device=/dev/dri \
    --security-opt seccomp=unconfined \
    --group-add video \
    --group-add render \
    -p "${PORT}:8000" \
    rocm/vllm:latest \
    python3 -m vllm.entrypoints.openai.api_server \
      --model "${MODEL_NAME}" \
      --host 0.0.0.0 \
      --port 8000 \
      --trust-remote-code \
      --max-model-len "${MAX_MODEL_LEN}"

echo "Waiting for vLLM server health endpoint..."
for i in {1..30}; do
    if curl -s -f "http://localhost:${PORT}/health" > /dev/null 2>&1 || curl -s -f "http://localhost:${PORT}/v1/models" > /dev/null 2>&1; then
        echo "✓ vLLM is online and ready for inference on http://localhost:${PORT}/v1"
        exit 0
    fi
    echo "Loading model into VRAM... ($i/30)"
    sleep 5
done

echo "Error: Timed out waiting for vLLM server."
exit 1
