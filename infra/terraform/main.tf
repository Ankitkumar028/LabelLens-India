terraform {
  required_version = ">= 1.5.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.36.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Cloud-Init / User-Data script to bootstrap Docker, ROCm drivers, and run vLLM
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    echo "=== Initializing AMD GPU Droplet for LabelLens vLLM ==="
    apt-get update && apt-get install -y curl ufw

    # Verify AMD ROCm device nodes
    if [ -e /dev/kfd ] && [ -e /dev/dri ]; then
      echo "ROCm GPU devices detected successfully."
    else
      echo "Warning: ROCm kernel devices not present or using emulation."
    fi

    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
      curl -fsSL https://get.docker.com -o get-docker.sh
      sh get-docker.sh
    fi

    # Run vLLM ROCm container with Qwen2.5-VL-7B-Instruct
    docker run -d \
      --name labellens-vllm \
      --restart unless-stopped \
      --device=/dev/kfd \
      --device=/dev/dri \
      --security-opt seccomp=unconfined \
      --group-add video \
      --group-add render \
      -p 8000:8000 \
      rocm/vllm:latest \
      python3 -m vllm.entrypoints.openai.api_server \
        --model Qwen/Qwen2.5-VL-7B-Instruct \
        --host 0.0.0.0 \
        --port 8000 \
        --trust-remote-code \
        --max-model-len 4096

    echo "vLLM server started on port 8000."
  EOF
}

# DigitalOcean GPU Droplet
resource "digitalocean_droplet" "gpu_box" {
  name       = "labellens-vllm-amd-droplet"
  region     = var.region
  size       = var.droplet_size
  image      = var.droplet_image
  ssh_keys   = var.ssh_keys
  user_data  = local.user_data
  monitoring = true

  tags = [
    "labellens",
    "ai-devops",
    "amd-rocm",
    "phase5-temporary"
  ]
}

# Security Firewall Guard
resource "digitalocean_firewall" "gpu_firewall" {
  name = "labellens-gpu-firewall"

  droplet_ids = [digitalocean_droplet.gpu_box.id]

  # Allow inbound SSH
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Allow inbound vLLM OpenAI-compatible API
  inbound_rule {
    protocol         = "tcp"
    port_range       = "8000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Allow all outbound traffic for package & model downloading
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
