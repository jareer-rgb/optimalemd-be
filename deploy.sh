#!/bin/bash

# GCP Deployment Script for OptimaleMD Backend
# This script deploys the NestJS backend to Google App Engine

set -e

echo "🚀 Starting deployment to Google App Engine..."

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ You are not authenticated with Google Cloud. Please run:"
    echo "   gcloud auth login"
    exit 1
fi

# Set project ID (replace with your actual project ID)
PROJECT_ID="optimale-be"

echo "📋 Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev

# Deploy to App Engine
echo "📦 Deploying to App Engine..."
gcloud app deploy app.yaml --quiet

# Get the deployed URL
DEPLOYED_URL=$(gcloud app describe --format="value(defaultHostname)")
echo "✅ Deployment successful!"
echo "🌐 Your app is available at: https://$DEPLOYED_URL"
echo "📚 API Documentation: https://$DEPLOYED_URL/api/docs"

# Optional: Open the app in browser
read -p "Would you like to open the app in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://$DEPLOYED_URL"
fi
