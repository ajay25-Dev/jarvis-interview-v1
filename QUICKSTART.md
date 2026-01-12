# Quick Start Guide

## Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3004` in your browser

### 4. Start the Backend (separate terminal)
The app expects a backend at `http://localhost:3001/api`. Ensure your backend is running.

## Main User Flows

### Flow 1: Create Profile → Upload JD → View Plan
```
/ (Home)
  ↓
/profile/create (Create Profile)
  ↓
/jd/upload (Upload Job Description)
  ↓
/plan/generate (Generate Plan)
  ↓
/plan (View Interview Plan)
```

### Flow 2: View Existing Profile
```
/ (Home)
  ↓
/profile (View Profile)
  ↓
Edit or continue
```

### Flow 3: Upload Another JD
```
/plan (Current Plan)
  ↓
"Generate New Plan" button
  ↓
/jd/upload
  ↓
/plan/generate
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3004)

# Production
npm run build           # Build for production
npm start              # Start production server

# Code Quality
npm run lint           # Run ESLint

# Testing
npm run test           # Run Playwright tests
npm run test:ui        # Run tests with UI
npm run test:debug     # Debug tests
npm run test:headed    # Run tests in headed mode
```

## File Organization

**Pages to customize:**
- `src/app/page.tsx` - Home dashboard
- `src/app/profile/create/page.tsx` - Profile form
- `src/app/jd/upload/page.tsx` - JD upload
- `src/app/plan/page.tsx` - Plan display

**Components to extend:**
- `src/components/ui/` - Reusable UI components
- Create new components as needed

**API routes to maintain:**
- `src/app/api/profile/route.ts`
- `src/app/api/jd/route.ts`
- `src/app/api/plan/route.ts`

## Key Directories

```
src/
├── app/                    # Pages and API routes
├── components/ui/          # UI components library
└── lib/
    └── utils.ts           # Utility functions

public/                    # Static assets
```

## Component Usage Example

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Content goes here</p>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

## Form Pattern

```tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function FormPage() {
  const [data, setData] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={data.email}
            onChange={handleChange}
          />
        </div>
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}
```

## Common Customizations

### Change Primary Color
Edit `src/app/globals.css`:
```css
:root {
  --brand: 242 84% 60%; /* Change HSL values */
}
```

### Add New Page
1. Create directory: `src/app/your-page/`
2. Add `page.tsx` inside
3. Route auto-generated at `/your-page`

### Add New Component
1. Create file: `src/components/your-component.tsx`
2. Import and use anywhere

### Add API Endpoint
1. Create directory: `src/app/api/your-endpoint/`
2. Add `route.ts` with `GET`, `POST`, etc.
3. Access at `/api/your-endpoint`

## Debugging

### Enable verbose logging
```tsx
console.log('Debug info:', data);
```

### Check API calls
- Open browser DevTools → Network tab
- Look for API requests
- Check response status and body

### TypeScript errors
```bash
npm run lint
```

### Build issues
```bash
rm -rf .next
npm run build
```

## Performance Tips

1. Use `'use client'` only for interactive components
2. Keep server components as default
3. Lazy load heavy components
4. Optimize images with `next/image`
5. Monitor bundle size with Lighthouse

## Mobile Testing

```bash
# Test on local network
npm run dev

# Then visit on phone: http://<your-ip>:3004
```

## Deployment

### To Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy automatically

### To any Node server
```bash
npm run build
npm start
```

## Helpful Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com)
- [TypeScript](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3004 in use | Change port: `npm run dev -- --port 3005` |
| Blank page | Check console for errors (F12) |
| Styles not loading | Clear `.next` folder: `rm -rf .next` |
| API not connecting | Verify backend URL in `.env.local` |
| TypeScript errors | Run `npm run lint` to see issues |

## Need Help?

- Check the browser console (F12)
- Look at the README.md
- Review IMPLEMENTATION_GUIDE.md
- Check server logs in terminal
- Search Next.js docs

---

**Happy coding! 🚀**
