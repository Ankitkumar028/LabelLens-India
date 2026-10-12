variable "do_token" {
  type        = string
  description = "DigitalOcean API token for provisioning AMD GPU Dev Cloud droplet"
  sensitive   = true
}

variable "region" {
  type        = string
  description = "DigitalOcean region hosting AMD GPU droplets"
  default     = "tor1"
}

variable "droplet_size" {
  type        = string
  description = "DigitalOcean GPU Droplet slug (AMD MI300X or supported GPU instance)"
  default     = "gpu-mi300x"
}

variable "droplet_image" {
  type        = string
  description = "Base operating system image with ROCm kernel support"
  default     = "ubuntu-22-04-x64"
}

variable "ssh_keys" {
  type        = list(string)
  description = "List of SSH key fingerprints or IDs authorized on the GPU droplet"
  default     = []
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"
}
