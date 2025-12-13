#!/bin/bash
# =============================================================================
# Teardown Google Cloud Memorystore for Redis
# =============================================================================
# This script removes the Redis instance and VPC connector
# =============================================================================

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REDIS_INSTANCE_NAME="vendit-redis"
VPC_CONNECTOR_NAME="vendit-connector"
CLOUD_RUN_SERVICE_NAME="vendit-mobile-backend"

echo "======================================"
echo "Tearing down Redis infrastructure"
echo "======================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

read -p "Are you sure you want to delete Redis and VPC connector? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Step 1: Remove Redis URL from Cloud Run
echo "Step 1: Removing REDIS_URL from Cloud Run..."
gcloud run services update $CLOUD_RUN_SERVICE_NAME \
  --region=$REGION \
  --remove-env-vars="REDIS_URL" \
  --clear-vpc-connector \
  --project=$PROJECT_ID

echo "✓ Cloud Run updated"
echo ""

# Step 2: Delete VPC Connector
echo "Step 2: Deleting VPC Connector..."
gcloud compute networks vpc-access connectors delete $VPC_CONNECTOR_NAME \
  --region=$REGION \
  --quiet \
  --project=$PROJECT_ID

echo "✓ VPC Connector deleted"
echo ""

# Step 3: Delete Redis instance
echo "Step 3: Deleting Redis instance..."
gcloud redis instances delete $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --quiet \
  --project=$PROJECT_ID

echo "✓ Redis instance deleted"
echo ""

echo "======================================"
echo "Teardown Complete!"
echo "======================================"