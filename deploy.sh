#!/bin/bash

# Deployment Script for Raspberry Pi

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# 2. Rebuild and restart containers
echo "🔄 Rebuilding Docker containers..."
docker compose down
docker compose up -d --build

# 3. Prune unused images to save space on Pi
echo "🧹 Cleaning up..."
docker image prune -f

echo "✅ Deployment Complete!"
echo "App running at http://$(hostname -I | awk '{print $1}'):9010"
