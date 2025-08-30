#!/bin/bash

echo "🚀 Setting up OptimaleMD Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/optimaleMD?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# App
PORT=3000
NODE_ENV=development
EOF
    echo "⚠️  Please update the .env file with your actual database credentials!"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the .env file with your database credentials"
echo "2. Run: npx prisma migrate dev --name init"
echo "3. Run: npm run start:dev"
echo ""
echo "🚀 Happy coding!"
