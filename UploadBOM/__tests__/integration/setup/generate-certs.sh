#!/bin/bash
set -euo pipefail

# Script to generate self-signed certificates for Dependency Track

# Define script directory and cert location
SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
CERT_DIR="${SETUP_DIR}/certs"

# Create certs directory if it doesn't exist
mkdir -p "${CERT_DIR}"

# Generate a self-signed certificate for the API server
echo "Generating self-signed certificate for API server..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/apiserver.key" \
  -out "${CERT_DIR}/apiserver.crt" \
  -subj "/CN=localhost/" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Generate a self-signed certificate for the frontend
echo "Generating self-signed certificate for frontend..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/frontend.key" \
  -out "${CERT_DIR}/frontend.crt" \
  -subj "/CN=localhost/" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set proper permissions
chmod 644 "${CERT_DIR}"/*.crt
chmod 600 "${CERT_DIR}"/*.key

echo "Certificates generated successfully in ${CERT_DIR}"
echo "You can now use these certificates with your docker-compose setup."
