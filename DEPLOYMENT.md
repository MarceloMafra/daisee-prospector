# DAISEE Prospector - Deployment Guide

This guide walks through deploying the DAISEE Prospector application to Vercel.

## Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- GitHub account (Vercel integrates with GitHub)
- Neon PostgreSQL database credentials
- Claude API key from [console.anthropic.com](https://console.anthropic.com)
- Project pushed to GitHub (public or private)

## Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: DAISEE Prospector MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daisee-prospector.git
git push -u origin main
```

## Step 2: Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Select your GitHub repository `daisee-prospector`
4. Click **"Import"**

## Step 3: Configure Environment Variables

In Vercel Dashboard, go to your project settings → **Environment Variables** and add:

### Application Configuration
- `NEXT_PUBLIC_APP_NAME` = `DAISEE Prospector`
- `NEXT_PUBLIC_APP_URL` = `https://your-vercel-url.vercel.app`

### Database Configuration
Get these from your Neon dashboard:

- `DATABASE_URL` = Your Neon connection string with `-pooler` endpoint
  - Format: `postgresql://user:password@ep-xxxxx-pooler.region.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1`

- `DIRECT_URL` = Your Neon direct connection string (for migrations)
  - Format: `postgresql://user:password@ep-xxxxx.region.neon.tech/neondb?sslmode=require`

### API Keys
- `ANTHROPIC_API_KEY` = Your Claude API key from console.anthropic.com

### Authentication (Optional)
- `NEXTAUTH_SECRET` = Generate a random secret: `openssl rand -hex 32`
- `NEXTAUTH_URL` = `https://your-vercel-url.vercel.app`

## Step 4: Deploy

1. Click **"Deploy"** in Vercel Dashboard
2. Wait for deployment to complete (typically 2-5 minutes)
3. Visit your app URL shown in Vercel dashboard

## Step 5: Verify Deployment

After deployment, test these endpoints:

```bash
# Get dashboard statistics
curl https://your-app.vercel.app/api/dashboard/stats

# Get compliance rules
curl https://your-app.vercel.app/api/compliance/validate

# Test with sample data
curl -X POST https://your-app.vercel.app/api/compliance/validate \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello world","regulation":"LGPD"}'
```

## Troubleshooting

### Database Connection Errors
- Verify DATABASE_URL uses the `-pooler` endpoint (not the direct endpoint)
- Check that connection pooling is enabled in Neon dashboard
- Ensure DIRECT_URL is set correctly for migrations

### 500 Errors
- Check Vercel logs: Dashboard → Project → Deployments → Function Logs
- Verify all environment variables are set correctly
- Make sure ANTHROPIC_API_KEY is valid

### API Endpoints Returning 404
- Clear Vercel cache: Project Settings → Deployments → Clear Cache
- Redeploy the project
- Verify routes exist in `/app/api/`

## Monitoring and Maintenance

### View Logs
```
Vercel Dashboard → Project → Deployments → Function Logs
```

### Scale the Database
If experiencing connection issues:
1. Go to Neon dashboard
2. Increase connection limit or upgrade plan
3. Update DATABASE_URL if endpoint changes

### Redeploy
```bash
# Push to main branch - Vercel auto-deploys
git push origin main
```

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_NAME` | Display name | DAISEE Prospector |
| `NEXT_PUBLIC_APP_URL` | App URL (public) | https://app.vercel.app |
| `DATABASE_URL` | Database connection (pooler) | postgresql://... |
| `DIRECT_URL` | Database migration URL | postgresql://... |
| `ANTHROPIC_API_KEY` | Claude API key | sk-ant-... |
| `NEXTAUTH_SECRET` | Auth signing key | hex string |
| `NEXTAUTH_URL` | Auth callback URL | https://app.vercel.app |

## Performance Notes

- All API routes are serverless functions (auto-scale)
- Database uses Neon's serverless PostgreSQL
- Typical response times: 50-200ms (API) + network
- Cold starts: ~1-2 seconds on first request after inactivity

## Cost Estimation (Monthly)

- **Vercel**: Free tier includes 100GB bandwidth, unlimited builds
- **Neon**: Free tier includes 3GB storage, 20GB bandwidth
- **Claude API**: Pay-per-token (~$0.003 per 1K tokens for Opus)
- **Estimate**: $5-50/month depending on usage

## Next Steps

1. Set up custom domain (optional)
2. Configure Vercel Analytics
3. Set up error monitoring (Sentry)
4. Implement proper authentication (NextAuth)
5. Add CI/CD checks and tests
