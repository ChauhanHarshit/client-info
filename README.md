# Creator App - Content Management Platform

A sophisticated content management and employee access control platform designed to empower digital creators with intelligent, adaptive tools for cross-platform content planning and precise user permissions.

## 🚀 Features

### Core Functionality
- **Creator Pages Management**: Dynamic pages with customizable layouts and aesthetic templates
- **Content Inspiration System**: Curated content feed with engagement tracking
- **Mobile-First Creator App**: TikTok-style vertical scrolling interface
- **Role-Based Access Control**: Granular permissions for employees and teams
- **Video Processing Pipeline**: HLS streaming with Transloadit integration
- **Client Portal System**: Token-based public access to creator profiles

### Technical Highlights
- **Full-Stack TypeScript**: Type-safe development across frontend and backend
- **React 18 + Vite**: Modern frontend with hot module replacement
- **Express.js API**: RESTful backend with session management
- **MySQL + Drizzle ORM**: Production-ready database with type-safe queries
- **ImageKit CDN**: Optimized media delivery with automatic format conversion
- **Transloadit Video Processing**: HLS encoding and thumbnail generation

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Shadcn/ui** component library
- **Tailwind CSS** with custom theming
- **Vite** for development and builds

### Backend Stack
- **Node.js** with Express.js
- **Drizzle ORM** with MySQL
- **Session-based authentication**
- **Multer** for file uploads
- **Dual auth system** (Replit OIDC + custom)

### Infrastructure
- **PlanetScale MySQL** database
- **ImageKit CDN** for media optimization
- **Transloadit** for video processing
- **Upstash Redis** for caching
- **Cloudflare** for DNS and CDN

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- MySQL database
- Environment variables (see `.env.example`)

### Installation
```bash
# Clone repository
git clone https://github.com/tastyyyycrm/creator-app.git
cd creator-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Configure your DATABASE_URL and other secrets

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL=mysql://...
SESSION_SECRET=your-secret-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tasty
IMAGEKIT_PUBLIC_KEY=your-public-key
IMAGEKIT_PRIVATE_KEY=your-private-key
TRANSLOADIT_AUTH_SECRET=your-auth-secret
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configuration
├── server/                # Express.js backend
│   ├── routes.ts          # API endpoints
│   ├── db.ts             # Database configuration
│   ├── storage.ts        # Data access layer
│   └── auth.ts           # Authentication setup
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle database schema
└── scripts/             # Build and deployment scripts
```

## 🗄️ Database Schema

### Core Tables
- **users**: Employee authentication (Replit OIDC)
- **creators**: Creator profiles and authentication
- **creator_pages**: Dynamic creator page content
- **content_pages**: Inspiration content management
- **teams**: Organization structure
- **roles**: Permission-based access control

### Content Management
- **creator_page_sections**: Page layout components
- **content_interactions**: Creator engagement tracking
- **aesthetic_templates**: Visual theme system
- **banner_inventory**: Media asset management

## 🚀 Deployment

### Production Build
```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

### Environment Configuration
- **Development**: Local MySQL + file uploads
- **Staging**: PlanetScale + ImageKit + feature flags
- **Production**: Full infrastructure stack with CDN

## 🔐 Authentication

### Employee Authentication
- **Replit OIDC** for internal users
- **Role-based permissions** with team assignments
- **Session-based** with PostgreSQL store

### Creator Authentication  
- **Custom username/password** system
- **Token-based public access** for creator pages
- **Mobile session management**

## 📱 Mobile Creator App

### Interface Features
- **TikTok-style navigation** with bottom tabs
- **Vertical video feed** with autoplay
- **Content engagement** (like/dislike/bookmark)
- **PWA functionality** for native-like experience

### Video Integration
- **HLS streaming** via Transloadit
- **Automatic thumbnails** generation
- **Mobile-optimized** playback controls
- **Bandwidth adaptive** streaming

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - Employee login
- `GET /api/auth/user` - Get current user
- `POST /api/creator/login` - Creator authentication

### Content Management
- `GET /api/content-pages` - List inspiration content
- `POST /api/content-pages` - Create new content
- `PUT /api/content-pages/:id` - Update content
- `DELETE /api/content-pages/:id` - Remove content

### Creator Pages
- `GET /api/creator-pages/:id` - Get creator page
- `PUT /api/creator-pages/:id` - Update page content
- `POST /api/creator-pages/:id/sections` - Add page section

## 🧪 Testing

### Video Pipeline Testing
```bash
# Test Transloadit integration
curl -X POST http://localhost:5000/api/video/test-pipeline

# Validate video processing
curl -X POST http://localhost:5000/api/video/validate \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "test-video.mp4"}'
```

### Database Testing
```bash
# Test database connection
node test-db-connection.js

# Run schema validation
npm run db:push --dry-run
```

## 📊 Monitoring

### Performance Metrics
- **Database connection pooling** with PlanetScale
- **CDN cache hit rates** via ImageKit
- **Video processing analytics** through Transloadit
- **User engagement tracking** in creator app

### Error Handling
- **Comprehensive logging** with structured data
- **Database timeout protection** 
- **API rate limiting** 
- **Graceful degradation** for media failures

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit pull request

### Code Standards
- **TypeScript strict mode** enabled
- **ESLint + Prettier** for formatting
- **Conventional commits** for changelog
- **Database migrations** via Drizzle

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Review documentation in `/docs`
- Check existing GitHub issues
- Contact development team

---

**Built with ❤️ for content creators.**
