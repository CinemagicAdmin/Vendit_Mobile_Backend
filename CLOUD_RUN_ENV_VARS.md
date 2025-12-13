# Required Environment Variables for Cloud Run Deployment

## Critical Variables (Must Set)
These variables have no defaults in production and will cause deployment to fail:

```bash
# Tap Payment Gateway (Required)
TAP_API_BASE_URL=https://api.tap.company/v2
TAP_SECRET_KEY=sk_live_YOUR_SECRET_KEY
TAP_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY
TAP_DEFAULT_CURRENCY=KWD
TAP_COUNTRY_CODE=965

# Supabase (Required)
SUPABASE_URL=your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Redis (Required)
REDIS_URL=redis://your-redis-host:6379

# JWT Secrets (Required)
JWT_ACCESS_SECRET=your-random-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-random-refresh-secret-min-32-chars

# Firebase (Required for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Email (Required)
EMAIL_FROM=no-reply@yourdomain.com

# Remote Machine API (Required)
REMOTE_MACHINE_BASE_URL=https://your-machine-api.com/rest
REMOTE_MACHINE_API_KEY=your-machine-api-key

# Cookie/Session Security (Required)
COOKIE_SECRET=your-random-session-secret-min-32-chars
```

## Optional Variables (Have Defaults)
These have sensible defaults but can be overridden:

```bash
# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=8080

# Token TTL
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

# Loyalty Program
LOYALTY_BASE_RATE=10
LOYALTY_HEALTHY_MULTIPLIER=1.5
LOYALTY_LOW_HEALTH_MULTIPLIER=1
LOYALTY_POINT_VALUE=0.001

# Referral Program
REFERRAL_INVITER_POINTS=250
REFERRAL_INVITEE_POINTS=250

# Remote Machine Sync
REMOTE_MACHINE_PAGE_SIZE=100

# Dispense Socket
DISPENSE_SOCKET_URL=wss://central-6vfl.onrender.com

# AI Image Generation (Optional)
VYRO_API_URL=https://api.vyro.ai/v1/imagine/api/generations
VYRO_API_KEY=your-vyro-key

# Webhooks (Optional)
TAP_WEBHOOK_SECRET=your-tap-webhook-secret
SILKRON_WEBHOOK_SECRET=your-silkron-webhook-secret

# Referral Sharing (Optional)
REFERRAL_SHARE_BASE_URL=https://yourapp.com/referral
REFERRAL_SHARE_MESSAGE=Join me on VendIT and get 250 points!
```

## Quick Deploy Command

Set all required variables at once (replace with your actual values):

```bash
gcloud run services update vendit-mobile-backend \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=production,\
TAP_API_BASE_URL=https://api.tap.company/v2,\
TAP_SECRET_KEY=sk_live_YOUR_SECRET_KEY,\
TAP_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY,\
TAP_DEFAULT_CURRENCY=KWD,\
TAP_COUNTRY_CODE=965,\
SUPABASE_URL=your-project.supabase.co,\
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key,\
SUPABASE_ANON_KEY=your-anon-key,\
REDIS_URL=redis://your-redis-host:6379,\
JWT_ACCESS_SECRET=your-random-access-secret,\
JWT_REFRESH_SECRET=your-random-refresh-secret,\
FIREBASE_PROJECT_ID=your-firebase-project,\
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com,\
EMAIL_FROM=no-reply@yourdomain.com,\
REMOTE_MACHINE_BASE_URL=https://your-machine-api.com/rest,\
REMOTE_MACHINE_API_KEY=your-machine-api-key,\
COOKIE_SECRET=your-random-session-secret"
```

For Firebase private key (multiline), set separately:

```bash
gcloud run services update vendit-mobile-backend \
  --region=us-central1 \
  --set-env-vars="FIREBASE_PRIVATE_KEY=$(cat firebase-key.txt)"
```

## Current Error

The deployment is failing with:
```
Invalid environment configuration: tapApiBaseUrl, tapDefaultCurrency
```

This means at minimum you need to set:
- `TAP_API_BASE_URL`
- `TAP_DEFAULT_CURRENCY`
- `TAP_SECRET_KEY`
- `TAP_PUBLIC_KEY`

But you'll also need all other required variables listed above for the app to fully function.