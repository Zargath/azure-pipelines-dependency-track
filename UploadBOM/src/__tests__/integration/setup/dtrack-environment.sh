#!/bin/bash
set -euo pipefail

# Configuration
BASE_URL="http://localhost:8080"
INITIAL_PASSWORD="admin"
NEW_PASSWORD="NewSecurePassword123!"
MAX_HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2 # seconds

# Define script directory and data storage location
SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
DATA_DIR="${SETUP_DIR}/dtrack-data"
DOCKER_COMPOSE_PATH="${SETUP_DIR}/docker-compose.test.yml"
API_KEY_FILE="${SETUP_DIR}/.test-api-key"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is not installed. Please install jq to continue."
  exit 1
fi

# Generate dummy NIST data for faster startup
generate_nist_dummy_data() {
  local data_dir=$1
  local nist_dir="${data_dir}/.dependency-track/nist"
  
  echo "Generating dummy NIST data in ${nist_dir}..."
  
  rm -rf "$nist_dir"
  mkdir -p "$nist_dir"
  
  # Generate dummy files for each year from 2002 to current year
  current_year=$(date +"%Y")
  for feed in $(seq "$current_year" "-1" "2002"); do
    touch "$nist_dir/nvdcve-1.1-$feed.json.gz"
    echo "9999999999999" > "$nist_dir/nvdcve-1.1-$feed.json.gz.ts"
  done
  
  echo "✓ Dummy NIST data generated successfully"
}

# Wait for API server to be ready
wait_for_api_server() {
  echo "Waiting for API server (${BASE_URL}) to be ready..."
  local is_ready=false
  local attempts=0

  while [[ "$is_ready" == "false" && $attempts -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
    local response
    # Add set +e to prevent script from exiting if curl fails
    set +e
    response=$(curl -s -f -w "%{http_code}" -o /dev/null "${BASE_URL}/api/version" 2>&1)
    local curl_exit_code=$?
    # Restore errexit
    set -e
    
    if [[ "$response" == "200" ]]; then
      echo "API server is ready."
      is_ready=true
    else
      attempts=$((attempts+1))
      echo "API server not ready yet. Attempt ${attempts}/${MAX_HEALTH_CHECK_RETRIES}. HTTP response: $response"
      sleep $HEALTH_CHECK_INTERVAL
    fi
  done

  if [[ "$is_ready" == "false" ]]; then
    echo "ERROR: API server did not become ready in the allocated time"
    exit 1
  fi

  # Additional delay to ensure everything is fully initialized
  sleep 2
}

# Setup authentication and get API key
setup_auth_and_api_key() {
  echo "Setting up authentication and generating API key..."

  # Force password change
  local password_change_response
  password_change_response=$(curl -s -X POST \
    "${BASE_URL}/api/v1/user/forceChangePassword" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=${INITIAL_PASSWORD}&newPassword=${NEW_PASSWORD}&confirmPassword=${NEW_PASSWORD}")

  # Login with new password
  local jwt_token
  jwt_token=$(curl -s -X POST \
    "${BASE_URL}/api/v1/user/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=${NEW_PASSWORD}" | tr -d '"')

  if [[ -z "$jwt_token" ]]; then
    echo "ERROR: Failed to login. JWT token is empty."
    exit 1
  fi

  # Get Administrator team UUID
  local admin_team_uuid
  admin_team_uuid=$(curl -s -X GET "${BASE_URL}/api/v1/team" \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" | 
    jq -r '.[] | select(.name=="Administrators") | .uuid')

  if [[ -z "$admin_team_uuid" ]]; then
    echo "ERROR: Failed to get Administrator team UUID"
    exit 1
  fi

  # Generate team API key
  local api_key
  api_key=$(curl -s -X PUT "${BASE_URL}/api/v1/team/${admin_team_uuid}/key" \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" |
    jq -r '.key')

  if [[ -z "$api_key" ]]; then
    echo "ERROR: Failed to generate team API key"
    exit 1
  fi

  # Save API key to file for tests to use
  echo "$api_key" > "$API_KEY_FILE"
  echo "✓ API key saved to ${API_KEY_FILE}"
}

# Start Dependency Track environment
start_dependency_track() {
  echo "Starting Dependency Track test environment..."

  # Create data directory if it doesn't exist
  mkdir -p "${DATA_DIR}"

  # Generate NIST dummy data
  generate_nist_dummy_data "$DATA_DIR"

  # Start the containers
  echo "Starting Docker containers..."
  docker-compose -f "$DOCKER_COMPOSE_PATH" up -d

  # Wait for the API server to be ready
  wait_for_api_server

  # Setup authentication and API key
  setup_auth_and_api_key

  echo "✓ Dependency Track test environment started successfully!"
}

# Stop Dependency Track environment
stop_dependency_track() {
  echo "Stopping Dependency Track containers..."
  
  # Stop containers
  docker-compose -f "$DOCKER_COMPOSE_PATH" down -v
  
  # Remove the API key file
  if [[ -f "$API_KEY_FILE" ]]; then
    rm -f "$API_KEY_FILE"
    echo "✓ API key file cleaned up."
  fi
  
  # Delete the contents of the dtrack-data directory
  if [[ -d "$DATA_DIR" ]]; then
    rm -rf "${DATA_DIR:?}/"{.,}*
    echo "✓ Data directory cleaned up."
  fi
  
  echo "✓ Dependency Track test environment stopped successfully!"
}

# Show script usage
show_usage() {
  echo "Usage: $0 [start|stop]"
  echo ""
  echo "Commands:"
  echo "  start    Start the Dependency Track test environment"
  echo "  stop     Stop the Dependency Track test environment and clean up data"
  exit 1
}

# Main script execution
case "${1:-}" in
  start)
    start_dependency_track
    ;;
  stop)
    stop_dependency_track
    ;;
  *)
    show_usage
    ;;
esac