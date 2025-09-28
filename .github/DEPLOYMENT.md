# Automatic Deployment Setup

This document explains how automatic deployments are configured for the Flare360 project.

## 🚀 GitHub Actions Workflows

### 1. Full Stack Deployment (`deploy-full-stack.yml`)
**Main workflow** that handles intelligent deployment based on changed files.

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub Actions UI

**Features:**
- **Smart Change Detection**: Only deploys components that have changed
- **Dependency Management**: Ensures migrations run before workers
- **Manual Override**: Can deploy specific components via workflow dispatch
- **Comprehensive Testing**: Runs tests before deployment

**Deployment Order:**
1. Database migrations (if changed)
2. Main worker & Ingest worker (parallel, if changed)
3. Frontend (if changed, after backend is ready)

### 2. Frontend Only (`deploy-frontend.yml`)
Focused frontend deployment with testing.

### 3. Backend Only (`deploy-backend.yml`)
Focused backend deployment for both workers.

## 🔧 Setup Requirements

### GitHub Secrets
Add these secrets to your repository:

1. **`CLOUDFLARE_API_TOKEN`**
   - Create at: https://dash.cloudflare.com/profile/api-tokens
   - Permissions needed:
     - Zone:Zone:Read
     - Account:Cloudflare Pages:Edit
     - Account:D1:Edit
     - Account:Workers Scripts:Edit

2. **`CLOUDFLARE_ACCOUNT_ID`** (optional, for Pages action)
   - Find at: https://dash.cloudflare.com → Right sidebar

### How to Add Secrets:
1. Go to your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the secrets listed above

## 🌐 Alternative: Cloudflare Pages Git Integration

For even more seamless deployment, you can set up direct Git integration:

### Steps:
1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Navigate to Pages**: Select "Pages" from the sidebar
3. **Connect Repository**:
   - Click "Create a project"
   - Choose "Connect to Git"
   - Select GitHub and authorize
   - Choose the `DCOM360` repository
4. **Configure Build Settings**:
   - **Framework preset**: None (or Vite)
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (root of repo)
5. **Environment Variables**:
   - Add any needed environment variables (e.g., `VITE_API_BASE`)

### Benefits of Git Integration:
- ✅ **Automatic deploys** on every push to main
- ✅ **Preview deployments** for pull requests
- ✅ **Built-in rollbacks** and deployment history
- ✅ **Zero configuration** after initial setup

## 🔄 Current Deployment Status

### Manual Deployments (Current)
- Frontend: Manual `wrangler pages deploy`
- Workers: Manual `wrangler deploy --env production`
- Database: Manual migration application

### After Setup (Automatic)
- ✅ **Push to main** → Automatic deployment
- ✅ **Pull requests** → Preview deployments
- ✅ **Rollbacks** → One-click via dashboard
- ✅ **Notifications** → Deployment status in GitHub

## 🛠️ Testing the Setup

### Test Automatic Deployment:
1. Make a small change to `frontend/src/App.tsx`
2. Commit and push to main
3. Check GitHub Actions tab for running workflows
4. Verify deployment at https://flare360-frontend.pages.dev

### Manual Deployment:
Use the GitHub Actions "Run workflow" button to deploy specific components.

## 📝 Troubleshooting

### Common Issues:
1. **API Token Permissions**: Ensure token has all required permissions
2. **Build Failures**: Check Node.js version and dependency compatibility
3. **Deployment Conflicts**: Migrations must complete before worker deployments

### Debugging:
- Check GitHub Actions logs for detailed error messages
- Verify secrets are properly set
- Test builds locally before pushing

## 🎯 Recommended Setup

**For maximum automation**:
1. Set up GitHub Actions workflows (already done ✅)
2. Add required secrets to GitHub repository
3. Optionally set up Cloudflare Pages Git integration for even smoother experience

This ensures that every push to main automatically updates your production system with proper testing and rollback capabilities.