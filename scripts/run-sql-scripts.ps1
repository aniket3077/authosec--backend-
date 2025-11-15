# PowerShell script to run SQL scripts via Prisma
# Since psql might not be installed, we'll use Prisma's db execute

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DATABASE SETUP - Clearing and Seeding Demo Data" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location "d:\review\authosec--backend-"

# Step 1: Clear database
Write-Host "Step 1: Clearing database..." -ForegroundColor Yellow
Write-Host ""

$clearSQL = Get-Content "scripts\clear-database.sql" -Raw

try {
    # Using npx prisma db execute with stdin
    $clearSQL | npx prisma db execute --stdin --schema=prisma/schema.prisma
    Write-Host "✅ Database cleared successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to clear database: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 2: Seed demo data
Write-Host "Step 2: Seeding demo data..." -ForegroundColor Yellow
Write-Host ""

$seedSQL = Get-Content "scripts\seed-demo-data.sql" -Raw

try {
    # Using npx prisma db execute with stdin
    $seedSQL | npx prisma db execute --stdin --schema=prisma/schema.prisma
    Write-Host "✅ Demo data seeded successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to seed data: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Demo data includes:" -ForegroundColor White
Write-Host "   • 3 Companies" -ForegroundColor Gray
Write-Host "   • 7 Users (password: Demo@123456)" -ForegroundColor Gray
Write-Host "   • 6 Transactions (all status states)" -ForegroundColor Gray
Write-Host "   • Notifications and OTP logs" -ForegroundColor Gray
Write-Host ""
Write-Host "🔐 Test login with:" -ForegroundColor White
Write-Host "   sender1@techcorp.com / Demo@123456" -ForegroundColor Gray
Write-Host ""
