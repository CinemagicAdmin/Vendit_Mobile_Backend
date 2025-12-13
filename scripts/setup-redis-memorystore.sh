#!/bin/bash
# =============================================================================
# Setup Google Cloud Memorystore for Redis - Vendit Mobile Backend
# =============================================================================
# This script creates a Redis instance and VPC connector for Cloud Run
# =============================================================================

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REDIS_INSTANCE_NAME="vendit-redis"
VPC_CONNECTOR_NAME="vendit-connector"
CLOUD_RUN_SERVICE_NAME="vendit-mobile-backend"

echo "======================================"
echo "Setting up Redis for Cloud Run"
echo "======================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Enable required APIs
echo "Step 1: Enabling required APIs..."
gcloud services enable redis.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  --project=$PROJECT_ID

echo "✓ APIs enabled"
echo ""

# Step 2: Create Memorystore Redis instance
echo "Step 2: Creating Memorystore Redis instance..."
echo "Instance: $REDIS_INSTANCE_NAME"
echo "Tier: Basic (1GB)"
echo "Version: Redis 7.2"
echo ""

gcloud redis instances create $REDIS_INSTANCE_NAME \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_2 \
  --tier=basic \
  --network=default \
  --redis-config maxmemory-policy=allkeys-lru \
  --project=$PROJECT_ID

echo "✓ Redis instance created"
echo ""

# Step 3: Get Redis connection details
echo "Step 3: Getting Redis connection details..."
REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='get(host)' \
  --project=$PROJECT_ID)

REDIS_PORT=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='get(port)' \
  --project=$PROJECT_ID)

REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"

echo "✓ Redis connection details:"
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"
echo "  URL: $REDIS_URL"
echo ""

# Step 4: Create VPC Connector for Cloud Run
echo "Step 4: Creating VPC Connector for Cloud Run..."
echo "Connector: $VPC_CONNECTOR_NAME"
echo "IP Range: 10.8.0.0/28"
echo ""

gcloud compute networks vpc-access connectors create $VPC_CONNECTOR_NAME \
  --region=$REGION \
  --range=10.8.0.0/28 \
  --network=default \
  --project=$PROJECT_ID

echo "✓ VPC Connector created"
echo ""

# Step 5: Update Cloud Run service
echo "Step 5: Updating Cloud Run service with Redis configuration..."
echo "Service: $CLOUD_RUN_SERVICE_NAME"
echo ""

gcloud run services update $CLOUD_RUN_SERVICE_NAME \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --vpc-egress=private-ranges-only \
  --set-env-vars="REDIS_URL=$REDIS_URL" \
  --project=$PROJECT_ID

echo "✓ Cloud Run service updated"
echo ""

# Step 6: Verify setup
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Redis Instance Details:"
echo "  Name: $REDIS_INSTANCE_NAME"
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"
echo "  Connection String: $REDIS_URL"
echo ""
echo "VPC Connector:"
echo "  Name: $VPC_CONNECTOR_NAME"
echo "  Region: $REGION"
echo ""
echo "Cloud Run Service:"
echo "  Name: $CLOUD_RUN_SERVICE_NAME"
echo "  Environment: REDIS_URL=$REDIS_URL"
echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo "1. Test Redis connection:"
echo "   gcloud run services describe $CLOUD_RUN_SERVICE_NAME --region=$REGION"
echo ""
echo "2. View Redis metrics:"
echo "   gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION"
echo ""
echo "3. Monitor Cloud Run logs:"
echo "   gcloud run services logs read $CLOUD_RUN_SERVICE_NAME --region=$REGION"
echo ""
echo "4. Estimated monthly cost:"
echo "   - Memorystore Basic 1GB: ~\$40/month"
echo "   - VPC Connector: ~\$18/month"
echo "   - Total: ~\$58/month"
echo ""
echo "======================================"