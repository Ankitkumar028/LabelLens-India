output "gpu_droplet_id" {
  value       = digitalocean_droplet.gpu_box.id
  description = "The ID of the AMD GPU Droplet"
}

output "gpu_droplet_ip" {
  value       = digitalocean_droplet.gpu_box.ipv4_address
  description = "Public IPv4 address of the GPU Droplet"
}

output "vllm_api_base" {
  value       = "http://${digitalocean_droplet.gpu_box.ipv4_address}:8000/v1"
  description = "OpenAI-compatible vLLM base URL for LabelLens LLM_PROVIDER=vllm"
}

output "ssh_command" {
  value       = "ssh root@${digitalocean_droplet.gpu_box.ipv4_address}"
  description = "SSH connection string to inspect the GPU droplet"
}
