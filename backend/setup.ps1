# 🚀 Quick Start Script

Write-Host "🚀 K Backend Setup" -ForegroundColor Cyan
Write-Host "==================`n" -ForegroundColor Cyan

# Navigate to backend directory
Write-Host "📂 Navigating to backend directory..." -ForegroundColor Yellow
Set-Location backend

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma Client
Write-Host "`n🔨 Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate

# Push database schema
Write-Host "`n💾 Pushing database schema..." -ForegroundColor Yellow
npm run prisma:push

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`n📡 Starting development server..." -ForegroundColor Yellow
Write-Host "   Server will run on: http://localhost:3001`n" -ForegroundColor Cyan

# Start the development server
npm run dev
