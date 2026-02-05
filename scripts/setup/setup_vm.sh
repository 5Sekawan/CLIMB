#!/bin/bash

# =================================================================
# CLIMB VM Setup Script
# Purpose: Provisioning Ubuntu VM with Docker & project structure
# Usage: 
#   1. Copy this content to vm using: nano setup_vm.sh
#   2. Run: chmod +x setup_vm.sh && ./setup_vm.sh
# =================================================================

echo "Starting CLIMB VM Setup..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker dependencies
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  \"$($(. /etc/os-release && echo \"$VERSION_CODENAME\"))\" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine

sudo apt-get update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin



# Setup project directory

mkdir -p ~/CLIMB

sudo chown $USER:$USER ~/CLIMB



# Optional: Open common web ports (Standard for GCP VM)

sudo ufw allow 80/tcp

sudo ufw allow 443/tcp

sudo ufw allow 22/tcp



echo "==========================================================" 
echo "VM Setup complete!"
echo "Next steps:"
echo "1. Log out and log back in to apply docker group changes."
echo "2. Clone your repository: git clone <repo_url> ~/CLIMB"
echo "3. Follow the CI/CD setup in PRD.md"
echo "==========================================================