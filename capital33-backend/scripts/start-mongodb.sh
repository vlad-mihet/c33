#!/bin/bash

# Start MongoDB Docker container for Capital 33 Backend

echo "🐳 Starting MongoDB Docker container..."

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^capital33-mongo$'; then
  echo "📦 Container 'capital33-mongo' already exists"

  # Check if it's running
  if docker ps --format '{{.Names}}' | grep -q '^capital33-mongo$'; then
    echo "✅ MongoDB is already running"
  else
    echo "🔄 Starting existing container..."
    docker start capital33-mongo
    echo "✅ MongoDB container started"
  fi
else
  echo "📦 Creating new MongoDB container..."
  docker run -d \
    --name capital33-mongo \
    -p 27017:27017 \
    -e MONGO_INITDB_DATABASE=capital33 \
    mongo:6
  echo "✅ MongoDB container created and started"
fi

echo ""
echo "📊 MongoDB connection details:"
echo "   URI: mongodb://localhost:27017/capital33"
echo "   Container: capital33-mongo"
echo ""
echo "🔧 Useful commands:"
echo "   Stop:    docker stop capital33-mongo"
echo "   Start:   docker start capital33-mongo"
echo "   Logs:    docker logs capital33-mongo"
echo "   Remove:  docker rm -f capital33-mongo"
echo ""
