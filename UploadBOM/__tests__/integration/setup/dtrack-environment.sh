#!/bin/bash
set -euo pipefail

# Configuration
BASE_URL="https://localhost:8080"
INITIAL_PASSWORD="admin"
NEW_PASSWORD="NewSecurePassword123!"
MAX_HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2 # seconds
CURL_OPTS="-k" # Skip SSL verification for self-signed certificates

# Define script directory and data storage location
SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
DATA_DIR="${SETUP_DIR}/dtrack-data"
DOCKER_COMPOSE_PATH="${SETUP_DIR}/docker-compose.test.yml"
API_KEYS_DIR="${SETUP_DIR}/api-keys"
ADMIN_API_KEY_FILE="${API_KEYS_DIR}/admin.key"

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

  # Check Docker container health status
  echo "Initial container status:"
  docker-compose -f "$DOCKER_COMPOSE_PATH" ps

  # Increase timeout for containers still in "health: starting" state
  local MAX_HEALTH_CHECK_RETRIES=60  # Increased from 30

  while [[ "$is_ready" == "false" && $attempts -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
    # Check container health every 5 attempts
    if (( attempts % 5 == 0 )); then
      echo "Container status check:"
      docker-compose -f "$DOCKER_COMPOSE_PATH" ps
    fi
    
    set +e
    local temp_headers=$(mktemp)
    local temp_body=$(mktemp)
    local http_code=$(curl -s -k -w "%{http_code}" -D "$temp_headers" -o "$temp_body" "${BASE_URL}/api/version" 2>&1)
    local curl_exit_code=$?
    set -e
    
    echo "Attempt ${attempts}/${MAX_HEALTH_CHECK_RETRIES}: HTTP code: $http_code, curl exit code: $curl_exit_code"
    
    if [[ "$http_code" == "200" ]]; then
      echo "API server is ready."
      is_ready=true
    elif [[ "$http_code" == "503" ]]; then
      attempts=$((attempts+1))
      echo "API server returned 503 Service Unavailable. Container health likely still 'starting'."
      if [[ -s "$temp_body" ]]; then
        echo "Response body: $(cat "$temp_body")"
      fi
    else
      attempts=$((attempts+1))
      echo "API server not ready yet. HTTP response: $http_code"
    fi
    
    rm -f "$temp_headers" "$temp_body"
    
    if [[ "$is_ready" == "false" && $attempts -lt $MAX_HEALTH_CHECK_RETRIES ]]; then
      echo "Waiting ${HEALTH_CHECK_INTERVAL} seconds before next attempt..."
      sleep $HEALTH_CHECK_INTERVAL
    fi
  done

  if [[ "$is_ready" == "false" ]]; then
    echo "ERROR: API server did not become ready in the allocated time"
    echo "Final Docker container status:"
    docker-compose -f "$DOCKER_COMPOSE_PATH" ps
    echo "Container logs:"
    docker-compose -f "$DOCKER_COMPOSE_PATH" logs --tail=100
    exit 1
  fi

  # Additional delay to ensure everything is fully initialized
  sleep 5
}

# Setup authentication and get API key
setup_auth_and_admin_api_key() {
  echo "Setting up authentication and generating Admin API key..."

  # Force password change
  local password_change_response
  password_change_response=$(curl -s -k -X POST \
    "${BASE_URL}/api/v1/user/forceChangePassword" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=${INITIAL_PASSWORD}&newPassword=${NEW_PASSWORD}&confirmPassword=${NEW_PASSWORD}")

  # Login with new password
  local jwt_token
  jwt_token=$(curl -s -k -X POST \
    "${BASE_URL}/api/v1/user/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=${NEW_PASSWORD}" | tr -d '"')

  if [[ -z "$jwt_token" ]]; then
    echo "ERROR: Failed to login. JWT token is empty."
    exit 1
  fi

  # Get Administrator team UUID
  local admin_team_uuid
  admin_team_uuid=$(curl -s -k -X GET "${BASE_URL}/api/v1/team" \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" | 
    jq -r '.[] | select(.name=="Administrators") | .uuid')

  if [[ -z "$admin_team_uuid" ]]; then
    echo "ERROR: Failed to get Administrator team UUID"
    exit 1
  fi

  # Generate team API key
  local api_key
  api_key=$(curl -s -k -X PUT "${BASE_URL}/api/v1/team/${admin_team_uuid}/key" \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" |
    jq -r '.key')

  if [[ -z "$api_key" ]]; then
    echo "ERROR: Failed to generate team API key"
    exit 1
  fi

  # Save API key to file for tests to use
  echo "$api_key" > "$ADMIN_API_KEY_FILE"
  echo "✓ API key saved to ${ADMIN_API_KEY_FILE}"
}

setup_least_privilege_api_keys() {
  echo "Setting up least privilege API keys..."
  local admin_api_key
  admin_api_key=$(cat "$ADMIN_API_KEY_FILE")
  
  # Define team configurations (team_name:permission1,permission2,...)
  local team_configs=(
    "BOM-Upload-Only:BOM_UPLOAD"
    "BOM-Upload-Viewer:BOM_UPLOAD,VIEW_PORTFOLIO"
    "Project-Creator:BOM_UPLOAD,VIEW_PORTFOLIO,PROJECT_CREATION_UPLOAD"
    "Portfolio-Manager:BOM_UPLOAD,VIEW_PORTFOLIO,PROJECT_CREATION_UPLOAD,PORTFOLIO_MANAGEMENT"
  )
  
  for team_config in "${team_configs[@]}"; do
    local team_name="${team_config%%:*}"
    local permissions="${team_config#*:}"
    
    echo "Creating team: $team_name with permissions: $permissions"
    
    # Create team using PUT method as per OpenAPI spec
    local create_response
    create_response=$(curl -s -k -w "HTTP_CODE:%{http_code}" -X PUT "${BASE_URL}/api/v1/team" \
      -H "X-API-Key: ${admin_api_key}" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"${team_name}\"}")
    
    local http_code="${create_response##*HTTP_CODE:}"
    local response_body="${create_response%HTTP_CODE:*}"
    
    local team_uuid
    if [[ "$http_code" == "201" || "$http_code" == "200" ]]; then
      team_uuid=$(echo "$response_body" | jq -r '.uuid' 2>/dev/null)
      if [[ -n "$team_uuid" && "$team_uuid" != "null" ]]; then
        echo "  ✓ Team created with UUID: $team_uuid"
      else
        echo "  ERROR: Could not extract UUID from response: $response_body"
        continue
      fi
    else
      echo "  ERROR: Failed to create team $team_name. HTTP: $http_code, Response: $response_body"
      continue
    fi
    
    # Add permissions to team
    IFS=',' read -ra permission_array <<< "$permissions"
    for permission in "${permission_array[@]}"; do
      echo "  Adding permission: $permission"
      local perm_response
      perm_response=$(curl -s -k -w "HTTP_CODE:%{http_code}" -X POST "${BASE_URL}/api/v1/permission/${permission}/team/${team_uuid}" \
        -H "X-API-Key: ${admin_api_key}" \
        -H "Content-Type: application/json")
      
      local perm_http_code="${perm_response##*HTTP_CODE:}"
      if [[ "$perm_http_code" != "200" && "$perm_http_code" != "201" ]]; then
        local perm_response_body="${perm_response%HTTP_CODE:*}"
        echo "    ERROR: Failed to add permission $permission. HTTP: $perm_http_code, Response: $perm_response_body"
      fi
    done
    
    # Generate API key for team
    echo "  Generating API key..."
    local key_response
    key_response=$(curl -s -k -w "HTTP_CODE:%{http_code}" -X PUT "${BASE_URL}/api/v1/team/${team_uuid}/key" \
      -H "X-API-Key: ${admin_api_key}" \
      -H "Content-Type: application/json")
    
    local key_http_code="${key_response##*HTTP_CODE:}"
    local key_response_body="${key_response%HTTP_CODE:*}"
    
    local team_api_key
    if [[ "$key_http_code" == "201" || "$key_http_code" == "200" ]]; then
      team_api_key=$(echo "$key_response_body" | jq -r '.key' 2>/dev/null)
      
      if [[ -n "$team_api_key" && "$team_api_key" != "null" ]]; then
        # Save API key to file
        echo "$team_api_key" > "${API_KEYS_DIR}/${team_name}.key"
        echo "  ✓ API key saved for $team_name"
      else
        echo "  ERROR: Could not extract API key from response: $key_response_body"
      fi
    else
      echo "  ERROR: Failed to generate API key for $team_name. HTTP: $key_http_code, Response: $key_response_body"
    fi
    
    echo ""
  done
  
  echo "✓ Least privilege API keys setup completed"
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

  # Create API keys directory
  mkdir -p "$API_KEYS_DIR"

  # Setup authentication and API keys
  setup_auth_and_admin_api_key
  setup_least_privilege_api_keys

  echo "✓ Dependency Track test environment started successfully!"
}

# Stop Dependency Track environment
stop_dependency_track() {
  echo "Stopping Dependency Track containers..."
  
  # Stop containers
  docker-compose -f "$DOCKER_COMPOSE_PATH" down -v
  
  # Remove the API keys directory
  local API_KEYS_DIR="${SETUP_DIR}/api-keys"
  if [[ -d "$API_KEYS_DIR" ]]; then
    rm -rf "$API_KEYS_DIR"
    echo "✓ API keys directory cleaned up."
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