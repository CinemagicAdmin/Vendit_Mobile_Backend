# Deployment Guide - Cookie-Based Authentication Migration

## Overview

This guide covers deploying the Vend-IT backend and frontend after migrating from localStorage JWT tokens to httpOnly cookie-based authentication.

---

## Pre-Deployment Checklist

### Backend Environment Variables

Ensure these new variables are set in production:

```bash
# Required for cookie-based auth
JWT_REFRESH_SECRET=<generate-with-openssl-rand-hex-32>
CSRF_SECRET=<generate-with-openssl-rand-hex-32>
COOKIE_DOMAIN=.yourdomain.com
FRONTEND_URL=https://admin.yourdomain.com

# Verify existing
JWT_ACCESS_SECRET=<your-existing-secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Database & Dependencies

- ✅ PostgreSQL (Supabase) is accessible
- ✅ Redis is running and accessible
- ✅ All migrations are applied

---

##Deployment Sequence

> [!WARNING]
> **Breaking Change**: Users will be logged out and must re-authenticate after deployment.

### Step 1: Deploy Backend (**Deploy First**)

**Why first**: Backend supports both cookie-based (web) and header-based (mobile) authentication for backward compatibility.

```bash
cd /path/to/Vend-IT-backend

# Build
npm run build

# Deploy to your platform
# Example for Cloud Run:
gcloud run deploy vendit-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Or using Docker:
docker build -t vendit-backend .
docker push yourregistry/vendit-backend:latest
# Deploy via your platform
```

**Verify backend deployment**:
```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok"}
```

### Step 2: Deploy Frontend (**Deploy Immediately After**)

**Why immediately**: Frontend only works with cookie-based backend. Minimize gap between deployments.

```bash
cd /path/to/vend-it-frontend-admin

# Build
npm run build

# Deploy to your platform
# Example for Vercel:
vercel --prod

# Example for static hosting:
npm run build
# Upload .next/standalone and .next/static to your CDN
```

**Verify frontend deployment**:
- Navigate to https://admin.yourdomain.com/login
- Check browser DevTools → Network → Cookies
- Login should set 3 cookies: `access_token`, `refresh_token`, `csrf_token`

### Step 3: Post-Deployment Verification

**Test authentication flow**:
1. Navigate to login page
2. Login with admin credentials
3. Verify cookies are set (DevTools → Application → Cookies)
4. Navigate to dashboard
5. Refresh page - should stay authenticated
6. Logout - cookies should be cleared

**Monitor errors**:
```bash
# Backend logs
# Check for authentication errors, cookie errors, CSRF errors

# Frontend logs  
# Check browser console for errors

# Database
# Check audit_logs table for login/logout activity
```

---

## Rollback Plan

If issues occur, you have two options:

### Option A: Quick Rollback (Recommended)

Deploy previous versions of both backend and frontend:

```bash
# Rollback backend
git checkout <previous-stable-tag>
npm run build
# Deploy

# Rollback frontend
git checkout <previous-stable-tag>  
npm run build
# Deploy
```

### Option B: Hotfix Forward

If the issue is minor, fix and redeploy:

```bash
# Fix the issue
git commit -m "hotfix: ..."
npm run build
# Deploy
```

---

## Breaking Changes

### For Users
- **All users will be logged out** after deployment
- Users must re-login with their credentials
- Mobile apps (if using header-based auth) will continue to work

### For Developers
- localStorage is no longer used for tokens
- Tokens are now in httpOnly cookies (JavaScript cannot access them)
- CSRF token must be sent with all mutation requests
- Session is validated on page load via `/admin/me` endpoint

---

## Common Issues & Solutions

### Issue: Cookies Not Being Set

**Symptoms**:
- Login succeeds but user is immediately logged out
- No cookies visible in DevTools

**Solutions**:
1. Check `COOKIE_DOMAIN` in backend `.env`
   - Development: `localhost`
   - Production: `.yourdomain.com` (note the dot)
2. Verify `COOKIE_SECURE` setting
   - Development: `false`
   - Production: `true`
3. Ensure frontend and backend are on same domain/subdomain

### Issue: CSRF Token Invalid

**Symptoms**:
- Mutations fail with 401/403
- Error: "Invalid CSRF token"

**Solutions**:
1. Verify `CSRF_SECRET` is set in backend
2. Check frontend is sending `x-csrf-token` header
3. Ensure `csrf_token` cookie exists and matches header value

### Issue: Infinite Redirect Loop

**Symptoms**:
- Login page keeps refreshing
- `/login` appears multiple times in Network tab

**Solutions**:
- Already fixed in latest version
- Ensure both backend and frontend are on latest version
- Clear browser cookies and try again

### Issue: Session Not Persisting

**Symptoms**:
- User logged out after page refresh
- Auth state lost on navigation

**Solutions**:
1. Check `/admin/me` endpoint is returning user data
2. Verify cookies have correct `maxAge` and `httpOnly` settings
3. Ensure browser is not blocking cookies

---

## Monitoring

### Key Metrics to Watch

**Authentication**:
- Login success/failure rate
- Session duration
- Token refresh frequency
- CSRF validation failures

**Performance**:
- `/admin/login` response time
- `/admin/me` response time (called on every page load)
- Cookie parsing overhead

**Errors to Monitor**:
- `CSRF_TOKEN_INVALID`
- `TOKEN_EXPIRED`  
- `AUTHENTICATION_FAILED`
- `INVALID_REFRESH_TOKEN`

### Logging

Check logs for:
```bash
# Successful logins
grep "Admin login" /var/log/vendit-backend.log

# CSRF errors
grep "Invalid CSRF token" /var/log/vendit-backend.log

# Token refresh
grep "Token close to expiry" /var/log/vendit-backend.log
```

---

## Mobile App Considerations

**Good News**: Mobile apps are not affected!

The backend maintains backward compatibility via the `X-Mobile-Client` header:

```typescript
// Mobile app should send this header
headers: {
  'X-Mobile-Client': 'true'
}

// Backend will return token in response body (legacy behavior)
```

No mobile app updates required for this deployment.

---

## Performance Impact

**Expected Changes**:
- **Login**: +5-10ms (CSRF token generation)
- **Protected Routes**: +2-5ms (cookie parsing vs localStorage)
- **New**: Session check on page load (`/admin/me`)

**Optimizations Included**:
- Automatic token refresh (reduces login frequency)
- Session check only on app initialization
- Redis caching for session data

---

## Security Improvements

This deployment provides significant security enhancements:

✅ **XSS Protection**: Tokens in httpOnly cookies can't be stolen via JavaScript  
✅ **CSRF Protection**: All mutations validated with CSRF tokens  
✅ **Automatic Token Refresh**: Reduces need for re-login  
✅ **Secure-Only in Production**: Cookies only sent over HTTPS  
✅ **SameSite Protection**: Prevents cross-site cookie leakage  

---

## Success Criteria

Deployment is successful when:

- ✅ Users can login successfully
- ✅ 3 cookies are set after login (`access_token`, `refresh_token`, `csrf_token`)
- ✅ Users stay authenticated across page refreshes
- ✅ Logout clears all cookies
- ✅ No infinite redirect loops
- ✅ Mobile apps still work (if applicable)
- ✅ No spike in authentication errors
- ✅ Session duration matches expectations

---

## Reference

- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
- [Walkthrough](../.gemini/antigravity/brain/447b49d1-4546-4950-88e3-f509dbe69c3d/walkthrough.md)
- [Implementation Plan](../.gemini/antigravity/brain/447b49d1-4546-4950-88e3-f509dbe69c3d/implementation_plan.md)
