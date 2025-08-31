#!/bin/bash

# Generate Prisma client if it doesn't exist
if [ ! -d "node_modules/.prisma/client" ]; then
    echo "Generating Prisma client..."
    npx prisma generate
fi

# Start the application
npm start
