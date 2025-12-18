# Environment Variables Guide

This guide documents all environment variables used in the Vend-IT backend application.

## Required Variables

### Application Settings
```bash
# Server Configuration
NODE_ENV=development              # Environment: development | production | test
PORT=4000                         # Server port (default: 4000)
APP_NAME=Vend-IT                  # Application name for logging

# Frontend URL (required for CORS)
FRONTEND_URL=http://localhost:3000   # Frontend application URL
```

### Database (Supabase)
```bash
# Required - Get from Supabase project settings
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

### Redis (Required for caching and BullMQ)
```bash
REDIS_URL=redis://localhost:6379     # Redis connection string
# Or individual components:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                      # Optional password
```

### Authentication & Security
```bash
# JWT Secrets (generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here    # New for cookie-based auth
ACCESS_TOKEN_TTL=15m                           # Access token expiry
REFRESH_TOKEN_TTL=30d                          # Refresh token expiry

# CSRF Protection (NEW - Required for cookie-based auth)
CSRF_SECRET=your_csrf_secret_here              # Generate with: openssl rand -hex 32

# Cookie Settings (NEW)
COOKIE_DOMAIN=localhost                         # Set to .yourdomain.com in production
COOKIE_SECURE=false                            # Set to true in production
```

## Optional Variables

### Firebase (Push Notifications)
```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Payment Gateway (Tap Payments)
```bash
TAP_SECRET_KEY=sk_test_xxxxx
TAP_PUBLIC_KEY=pk_test_xxxxx
TAP_WEBHOOK_SECRET=your_webhook_secret
```

### SMS Provider
```bash
SMS_PROVIDER=twilio                # Options: twilio | nexmo
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_secret
SMS_FROM_NUMBER=+1234567890
```

### Email
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@vendit.com
```

### Remote Machine API
```bash
REMOTE_MACHINE_BASE_URL=https://api.remotemachine.com
REMOTE_MACHINE_API_KEY=your_api_key
REMOTE_MACHINE_PAGE_SIZE=100
```

### Dispense WebSocket
```bash
DISPENSE_SOCKET_URL=wss://dispense.vendit.com
```

### Monitoring & Logging
```bash
# Sentry Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Log Level
LOG_LEVEL=info                    # Options: error | warn | info | debug
```

### CDN & Storage
```bash
CDN_BASE_URL=https://cdn.vendit.com
STORAGE_BUCKET=vendit-uploads
```

### Development Tools
```bash
# Ngrok (for webhook testing)
NGROK_AUTH_TOKEN=your_ngrok_token
NGROK_SUBDOMAIN=vendit-dev
```

---

## Breaking Changes - Cookie-Based Auth Migration

### New Required Variables
After migrating to cookie-based authentication, these variables are now **required**:

1. **`JWT_REFRESH_SECRET`** - Separate secret for refresh tokens
2. **`CSRF_SECRET`** - Secret for CSRF token generation
3. **`COOKIE_DOMAIN`** - Domain to set cookies on (`.yourdomain.com` in production)

### Updated Variables
- **`ACCESS_TOKEN_TTL`** - Now defaults to `15m` (was 24h)
- **`REFRESH_TOKEN_TTL`** - New, defaults to `30d`

### Example Production Config
```bash
# Production settings for cookie-based auth
NODE_ENV=production
JWT_ACCESS_SECRET=<generate-new-secret>
JWT_REFRESH_SECRET=<generate-new-secret>
CSRF_SECRET=<generate-new-secret>
COOKIE_DOMAIN=.vendit.com
COOKIE_SECURE=true
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
FRONTEND_URL=https://admin.vendit.com
```

---

## Security Best Practices

### Secret Generation
Generate strong secrets for JWT and CSRF:
```bash
# Generate JWT secrets (32 bytes = 64 hex characters)
openssl rand -hex 32

# Generate CSRF secret
openssl rand -hex 32
```

### Production Checklist
- ✅ All secrets are unique and randomly generated
- ✅ `NODE_ENV=production`
- ✅ `COOKIE_SECURE=true`
- ✅ `COOKIE_DOMAIN` set to your actual domain
- ✅ `FRONTEND_URL` matches your frontend domain
- ✅ Redis is secured with password
- ✅ Supabase service key is kept secret
- ✅ Sentry DSN configured for error tracking

### Never Commit
**NEVER** commit the following to version control:
- `.env` file
- Any file containing real API keys or secrets
- Database credentials
- JWT secrets

Always use `.env.example` with placeholder values.

---

## Deployment Coordination

### Backend-Frontend Deployment Order

> [!WARNING]
> Cookie-based auth is a **breaking change**. Backend and frontend must be deployed together.

**Deployment sequence**:
1. Deploy backend (supports both cookie AND header-based auth)
2. Deploy frontend immediately after
3. Users will be logged out and need to re-authenticate

**Why this order**:
- Backend is backward compatible (mobile apps using headers still work)
- Frontend only works with cookie-based backend
- Minimize downtime window

---

## Environment-Specific Configs

### Development
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
LOG_LEVEL=debug
```

### Staging
```bash
NODE_ENV=staging
FRONTEND_URL=https://staging.vendit.com
COOKIE_DOMAIN=.vendit.com
COOKIE_SECURE=true
LOG_LEVEL=info
SENTRY_ENVIRONMENT=staging
```

### Production
```bash
NODE_ENV=production
FRONTEND_URL=https://admin.vendit.com
COOKIE_DOMAIN=.vendit.com
COOKIE_SECURE=true
LOG_LEVEL=warn
SENTRY_ENVIRONMENT=production
```

---

## Troubleshooting

### Cookies Not Being Set
- Check `COOKIE_DOMAIN` matches your domain
- Ensure `COOKIE_SECURE=false` in development (localhost)
- Verify `FRONTEND_URL` in CORS configuration

### CSRF Token Errors
- Verify `CSRF_SECRET` is set
- Check frontend is sending `x-csrf-token` header
- Ensure cookies are enabled in browser

### Authentication Fails After Deployment
- Verify both backend and frontend deployed
- Check all new environment variables are set
- Monitor error logs for specific error codes
- Ensure Redis is running and accessible

---

## Reference
See `.env.example` for a complete template with all variables.
