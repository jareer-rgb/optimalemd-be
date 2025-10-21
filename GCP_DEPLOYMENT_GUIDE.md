x# GCP Deployment Guide for OptimaleMD Backend

This guide will help you deploy your NestJS backend to Google Cloud Platform using Google App Engine.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **Google Cloud CLI**: Install the Google Cloud CLI
3. **Node.js**: Version 18 or higher
4. **Database**: PostgreSQL database (Cloud SQL recommended)

## Step 1: Install Google Cloud CLI

### macOS (using Homebrew):
```bash
brew install google-cloud-sdk
```

### Manual Installation:
Download from: https://cloud.google.com/sdk/docs/install

## Step 2: Authenticate and Setup

1. **Login to Google Cloud**:
```bash
gcloud auth login
```

2. **Create a new project** (or use existing):
```bash
gcloud projects create your-project-id --name="OptimaleMD Backend"
```

3. **Set the project**:
```bash
gcloud config set project your-project-id
```

4. **Enable billing** for your project in the Google Cloud Console

## Step 3: Setup Database (Cloud SQL)

1. **Create a PostgreSQL instance**:
```bash
gcloud sql instances create optimale-md-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=your-root-password
```

2. **Create a database**:
```bash
gcloud sql databases create optimale_md_db --instance=optimale-md-db
```

3. **Create a user**:
```bash
gcloud sql users create optimale_md_user \
    --instance=optimale-md-db \
    --password=your-user-password
```

## Step 4: Configure Environment Variables

1. **Get your database connection string**:
```bash
gcloud sql instances describe optimale-md-db --format="value(connectionName)"
```

2. **Set environment variables in App Engine**:
```bash
gcloud app deploy app.yaml --set-env-vars \
    DATABASE_URL="postgresql://optimale_md_user:your-user-password@/optimale_md_db?host=/cloudsql/your-project-id:us-central1:optimale-md-db" \
    JWT_SECRET="your-jwt-secret" \
    STRIPE_SECRET_KEY="your-stripe-secret-key" \
    STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret" \
    EMAIL_HOST="your-email-host" \
    EMAIL_PORT="587" \
    EMAIL_USER="your-email-user" \
    EMAIL_PASS="your-email-password"
```

## Step 5: Update Configuration Files

1. **Update deploy.sh** with your project ID:
```bash
# Edit the PROJECT_ID variable in deploy.sh
PROJECT_ID="your-actual-project-id"
```

2. **Update CORS settings** in `src/main.ts`:
```typescript
app.enableCors({
  origin: ['https://your-frontend-domain.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Step 6: Deploy

1. **Run the deployment script**:
```bash
cd optimalemd-be
./deploy.sh
```

Or deploy manually:
```bash
gcloud app deploy app.yaml
```

## Step 7: Run Database Migrations

After deployment, run your Prisma migrations:

```bash
# Connect to your App Engine instance
gcloud app logs tail -s default

# In another terminal, run migrations
gcloud app deploy app.yaml --set-env-vars RUN_MIGRATIONS=true
```

## Step 8: Verify Deployment

1. **Check your app URL**:
```bash
gcloud app browse
```

2. **Check logs**:
```bash
gcloud app logs tail -s default
```

3. **Test your API**:
```bash
curl https://your-app-id.appspot.com/api/docs
```

## Environment Variables

Make sure to set these environment variables in your App Engine configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `EMAIL_HOST`: SMTP host for email
- `EMAIL_PORT`: SMTP port
- `EMAIL_USER`: Email username
- `EMAIL_PASS`: Email password
- `NODE_ENV`: Set to "production"

## Troubleshooting

### Common Issues:

1. **Database Connection Issues**:
   - Ensure Cloud SQL instance is running
   - Check connection string format
   - Verify firewall rules

2. **Build Failures**:
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Check for TypeScript compilation errors

3. **Runtime Errors**:
   - Check App Engine logs: `gcloud app logs tail -s default`
   - Verify environment variables are set correctly

### Useful Commands:

```bash
# View app status
gcloud app describe

# View logs
gcloud app logs tail -s default

# Scale your app
gcloud app versions list
gcloud app versions migrate v1 --quiet

# Delete app
gcloud app services delete default --quiet
```

## Cost Optimization

- Use `F1` instance class for development
- Set appropriate scaling parameters
- Monitor usage in Google Cloud Console
- Consider using Cloud Run for better cost control

## Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Database**: Use Cloud SQL with private IP
3. **HTTPS**: App Engine provides HTTPS by default
4. **CORS**: Configure CORS properly for production domains
5. **JWT**: Use strong, unique JWT secrets

## Next Steps

1. Set up a custom domain
2. Configure SSL certificates
3. Set up monitoring and alerting
4. Implement CI/CD pipeline
5. Set up backup strategie for your database
