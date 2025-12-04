#!/bin/bash

# Deploy Frontend to Firebase Hosting

set -e

echo "🚀 Deploying to Firebase Hosting..."
echo ""

cd "$(dirname "$0")"

# Build the frontend
echo "📦 Building frontend..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Build complete"
echo ""

# Deploy to Firebase Hosting
echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your app is live on Firebase Hosting!"
echo "Check the Firebase Console for your URL."
echo ""

