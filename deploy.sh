#!/bin/bash

# 🚀 TransactAI - One-Click Mobile App Deployment
# For real-world users

echo "📱 TransactAI Mobile App Deployment Script"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the frontend
echo "🔨 Building frontend..."
cd frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment Complete!"
echo "==============================="
echo "📱 Your TransactAI app is now live!"
echo "🌐 Check your Vercel dashboard for the live URL"
echo "📱 Works on all mobile devices"
echo "🔔 Ready for real users!"
echo ""
