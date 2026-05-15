#!/bin/bash
# SEANO AI Model Setup Script
# This script pulls the base model and creates the custom SEANO AI model

set -e

CONTAINER_NAME="seano_ollama"
MODEL_NAME="seano-ai"
BASE_MODEL="qwen2.5:3b"
MODELFILE_PATH="/tmp/Modelfile"

echo "=== SEANO AI Model Setup ==="
echo ""

# Check if Ollama container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Ollama container '${CONTAINER_NAME}' is not running."
    echo "   Run: docker compose up -d ollama"
    exit 1
fi

echo "✓ Ollama container is running"

# Pull base model
echo ""
echo "📥 Pulling base model: ${BASE_MODEL}..."
docker exec ${CONTAINER_NAME} ollama pull ${BASE_MODEL}
echo "✓ Base model pulled"

# Copy Modelfile into container
echo ""
echo "📄 Copying Modelfile to container..."
docker cp "$(dirname "$0")/Modelfile" ${CONTAINER_NAME}:${MODELFILE_PATH}
echo "✓ Modelfile copied"

# Create custom model
echo ""
echo "🔨 Creating custom model: ${MODEL_NAME}..."
docker exec ${CONTAINER_NAME} ollama create ${MODEL_NAME} -f ${MODELFILE_PATH}
echo "✓ Model '${MODEL_NAME}' created"

# Verify
echo ""
echo "📋 Verifying model..."
docker exec ${CONTAINER_NAME} ollama list | grep ${MODEL_NAME}

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Model '${MODEL_NAME}' is ready to use."
echo "Make sure OLLAMA_MODEL=${MODEL_NAME} is set in backend/.env"
echo ""
