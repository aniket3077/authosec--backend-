# K Backend - Next.js API

A production-ready Next.js backend for the K mobile app with Prisma ORM and PostgreSQL (Supabase).

## 🚀 Features

- ✅ **Next.js 15** - Latest App Router with TypeScript
- ✅ **Prisma ORM** - Type-safe database access
- ✅ **PostgreSQL** - Supabase database integration
- ✅ **CORS Enabled** - Configured for mobile app access
- ✅ **RESTful API** - Clean and organized endpoints
- ✅ **Validation** - Zod schema validation
- ✅ **Error Handling** - Consistent error responses
- ✅ **Pagination** - Built-in pagination support

## 📦 Installation

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

## 🔧 Development

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3001
```

## 🏗️ Build & Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Check API and database status

### Users
- `GET /api/users` - List all users (with pagination)
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Posts
- `GET /api/posts` - List all posts (with pagination)
- `POST /api/posts` - Create new post
- `GET /api/posts/[id]` - Get post by ID
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="your_supabase_connection_url"
DIRECT_URL="your_supabase_direct_url"

# Server
PORT=3001
NODE_ENV=development

# CORS (Add your Expo dev server URL)
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081
```

## 📱 Connect from Mobile App

In your Expo app, make API calls to:

```typescript
const API_URL = 'http://localhost:3001'; // or your deployed URL

// Example: Fetch users
const response = await fetch(`${API_URL}/api/users`);
const data = await response.json();
```

## 🗄️ Database Schema

The schema includes example models (User, Post). Update `prisma/schema.prisma` with your actual models.

After updating the schema:
```bash
npm run prisma:migrate
npm run prisma:generate
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Railway / Render
- Connect your repository
- Set build command: `npm run build`
- Set start command: `npm start`
- Add environment variables

## 📚 Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Validation**: Zod
- **Runtime**: Node.js

## 🤝 Integration with Expo App

1. Update your mobile app to call backend APIs
2. Remove Prisma from the Expo app (keep only in backend)
3. Update ALLOWED_ORIGINS in backend .env with your Expo dev URL
4. Use fetch/axios to call backend endpoints

## 📄 License

MIT
