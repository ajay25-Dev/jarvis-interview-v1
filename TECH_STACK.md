# Technology Stack

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   User Browser                           │
│         http://localhost:3004 (Next.js App)            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼────┐         ┌─────────▼─────────┐
   │  Pages  │         │  API Routes       │
   │         │         │  (/api/*)         │
   │ Routes  │         │                   │
   └────┬────┘         └────────┬──────────┘
        │                       │
        └───────────────┬───────┘
                        │
                   ┌────▼──────────────┐
                   │  Backend API      │
                   │  localhost:3001   │
                   │  /api/interview-  │
                   │  prep/*           │
                   └───────────────────┘
```

## 📦 Dependencies

### Frontend Framework & UI
```
next@15.5.9              - React framework
react@19.1.0             - UI library
react-dom@19.1.0         - DOM rendering
@radix-ui/*              - Headless UI components
tailwindcss@4.x          - Utility CSS
lucide-react             - Icons library
```

### Form & Data Handling
```
react-hook-form@7.62.0   - Form state management
zod@3.25.76              - Schema validation
@hookform/resolvers      - Form validators
class-variance-authority - Component variants
```

### Styling & Utilities
```
clsx                     - Conditional classnames
tailwind-merge           - Merge Tailwind classes
tailwindcss-animate      - Animation utilities
postcss                  - CSS processing
```

### Development & Quality
```
typescript@5.x           - Type safety
eslint@9.x               - Linting
@playwright/test@1.55.0  - E2E testing
@types/node              - Node types
```

### Authentication & Backend
```
@supabase/auth-helpers-nextjs - Auth helpers
@supabase/ssr                 - SSR support
```

## 🎯 Tech Decisions

### Why Next.js?
- ✅ Full-stack React framework
- ✅ Built-in API routes
- ✅ Server & Client components
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ File-based routing

### Why Tailwind CSS?
- ✅ Utility-first approach
- ✅ Small bundle size
- ✅ Easy customization
- ✅ Dark mode support
- ✅ Responsive design built-in

### Why Radix UI?
- ✅ Unstyled, composable components
- ✅ Accessibility first
- ✅ Low-level primitives
- ✅ Works perfectly with Tailwind

### Why TypeScript?
- ✅ Type safety
- ✅ Better IDE support
- ✅ Prevents runtime errors
- ✅ Self-documenting code
- ✅ Easy refactoring

### Why React Hook Form?
- ✅ Minimal re-renders
- ✅ Easy integration
- ✅ Built-in validation
- ✅ Small bundle size
- ✅ Great performance

## 🔄 Data Flow

### Profile Creation Flow
```
User Input (Form)
    ↓
React Hook Form (Validation)
    ↓
Client Component State
    ↓
POST /api/profile
    ↓
API Route (route.ts)
    ↓
Fetch to Backend
    ↓
Backend Response
    ↓
Navigation to Next Step
```

### Job Description Upload Flow
```
File/Text Input
    ↓
File Reader API (Browser)
    ↓
State Management
    ↓
POST /api/jd
    ↓
API Route (route.ts)
    ↓
Backend Processing
    ↓
Plan Generation
    ↓
Redirect to Plan View
```

### Plan Display Flow
```
GET /api/plan
    ↓
API Route (route.ts)
    ↓
Fetch from Backend
    ↓
useState + useEffect
    ↓
Render Plan Components
    ↓
Interactive UI
```

## 🏃 Runtime Stack

### Development
```bash
npm run dev
↓
next dev --port 3004
↓
- Hot Module Replacement (HMR)
- Fast Refresh
- Error overlay
- File watching
```

### Production
```bash
npm run build
↓
Next.js Build Process
↓
- Static Generation
- Server-Side Rendering
- Image Optimization
- Code Splitting

npm start
↓
Node.js Server
↓
- Production mode
- Optimized code
- Compressed assets
```

## 🗄️ File Organization

### Pages (`src/app/`)
```
layout.tsx              - Root layout
page.tsx               - Home dashboard
not-found.tsx          - 404 page

profile/
├── page.tsx           - View profile
└── create/
    └── page.tsx       - Create profile form

jd/
└── upload/
    └── page.tsx       - Upload job description

plan/
├── page.tsx           - View interview plan
└── generate/
    └── page.tsx       - Generation status

api/
├── profile/route.ts   - Profile endpoints
├── jd/route.ts        - Job description endpoints
└── plan/route.ts      - Interview plan endpoints
```

### Components (`src/components/ui/`)
```
card.tsx               - Card container
button.tsx             - Button with variants
input.tsx              - Text input field
label.tsx              - Form label
textarea.tsx           - Multi-line input
badge.tsx              - Tag/label component
progress.tsx           - Progress bar
```

### Utilities (`src/lib/`)
```
utils.ts               - Helper functions
```

## 🎨 Styling Architecture

### CSS Variables (`globals.css`)
```css
:root {
  /* Brand Colors */
  --brand: 242 84% 60%;              /* Indigo */
  --brand-accent: 160 84% 40%;       /* Emerald */
  
  /* Semantic Colors */
  --primary: oklch(...)               /* Indigo */
  --destructive: oklch(...)           /* Red */
  --border: oklch(...)                /* Gray */
  
  /* Spacing */
  --radius: 0.625rem;                 /* 10px */
}
```

### Tailwind Config
```typescript
// Maps CSS variables to Tailwind utilities
theme: {
  colors: {
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    // ... more colors
  }
}
```

### Usage
```tsx
// Utility classes
<div className="bg-primary text-primary-foreground p-6 rounded-lg">
  Content
</div>
```

## 🔌 API Integration

### Client-Side Communication
```typescript
// Fetch from client components
fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

### API Routes
```typescript
// route.ts - Backend communication
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const response = await fetch(
    `${API_BASE}/interview-prep/profile`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { ... }
    }
  );
  
  return NextResponse.json(data);
}
```

### Backend Connection
```
Client → /api/profile
         ↓
       route.ts
         ↓
  localhost:3001/api/interview-prep/profile
         ↓
Backend Response
         ↓
Client Receives Data
```

## 📊 Performance Optimizations

### Built-in Next.js Features
- ✅ Code splitting per page
- ✅ Automatic static optimization
- ✅ Image optimization
- ✅ CSS purging
- ✅ Tree shaking

### Component Level
- ✅ Server components by default
- ✅ Client components only when needed
- ✅ Lazy loading
- ✅ Memoization ready

### Development
- ✅ Hot Module Replacement
- ✅ Fast Refresh
- ✅ SWC compiler (turbopack)
- ✅ Incremental builds

## 🧪 Testing Stack

### Playwright Configuration
```typescript
defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3004',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
  }
})
```

### Test Environments
- Chromium
- Firefox
- WebKit (Safari)

## 🔒 Security Considerations

### Environment Variables
```
NEXT_PUBLIC_API_URL  - Backend API URL
# Never expose secrets in NEXT_PUBLIC_*
```

### API Routes
```typescript
// No secrets exposed
// User ID from request headers
const userId = request.headers.get('x-user-id')
```

### CORS
- Backend handles CORS
- API routes act as proxy

## 📱 Browser Support

**Tested & Supported:**
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Android Chrome 90+

## 🚀 Deployment Targets

### Recommended: Vercel
```bash
# Push to GitHub
# Connect to Vercel
# Auto-deployed on push
```

### Alternative: Self-hosted
```bash
npm run build
npm start
# Runs on port 3000 by default
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Bundle Size

**Approximate Sizes:**
- Core JS: ~150KB
- Styles: ~50KB
- Icons: ~100KB (Lucide React)
- Total Gzipped: ~80KB

## 🔧 Development Tools

### Recommended IDE
- Visual Studio Code
- Extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - Prettier
  - ESLint

### Browser Extensions
- React Developer Tools
- Next.js DevTools
- JSON Formatter

### CLI Tools
- Node Package Manager (npm)
- Git (version control)
- Terminal (cmd/bash/zsh)

## 📚 Additional Resources

### Official Documentation
- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [TypeScript](https://www.typescriptlang.org/docs)

### Community Resources
- Next.js Discord
- React Community
- Stack Overflow

## 🔄 Version Management

Current versions as of December 18, 2025:
- Next.js: 15.5.9
- React: 19.1.0
- TypeScript: 5.x
- Tailwind CSS: 4.x

Update periodically:
```bash
npm outdated          # Check for updates
npm update            # Update packages
npm audit             # Check security
```

---

**This tech stack provides a modern, scalable, and maintainable foundation for the Interview Prep application.**
