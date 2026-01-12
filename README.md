# Jarvis Interview Prep

A modern, AI-powered interview preparation application built with Next.js.

## Features

- **Profile Management**: Create and manage your interview preparation profile
- **Job Description Upload**: Upload or paste job descriptions to analyze
- **Personalized Plans**: Generate AI-powered interview prep plans tailored to your role
- **Focus Areas**: Structured domain-specific preparation guidance
- **Case Studies**: Real-world scenarios and practice problems
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15.5
- **UI Components**: React 19 with Radix UI primitives
- **Styling**: Tailwind CSS 4
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **API Client**: Native Fetch API

## Project Structure

```
jarvis-interview/
├── src/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── profile/      # Profile management pages
│   │   ├── jd/           # Job description pages
│   │   ├── plan/         # Interview plan pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   └── ui/           # Reusable UI components
│   └── lib/
│       └── utils.ts      # Utility functions
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3004`

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Pages

### Home (`/`)
Main dashboard showing current profile, interview plans, and quick action cards.

### Create Profile (`/profile/create`)
Form to set up interview preparation profile with role, experience level, and skills.

### Upload Job Description (`/jd/upload`)
Interface to paste or upload job descriptions for analysis.

### View Plan (`/plan`)
Displays personalized interview preparation plan with:
- Focus areas and domains
- Core topics to master
- Case studies
- Estimated preparation time
- Key performance indicators

## Components

### UI Components
- `Card` - Container component with header, content, and footer
- `Button` - Primary action button with multiple variants
- `Input` - Text input field
- `Textarea` - Multi-line text input
- `Label` - Form labels
- `Badge` - Tag/badge component
- `Progress` - Progress bar

## Design System

The application follows the Jarvis brandbook with:
- **Primary Color**: Indigo (HSL 242 84% 60%)
- **Accent Color**: Emerald (HSL 160 84% 40%)
- **Border Radius**: 10px (customizable)
- **Typography**: System sans-serif with 600 weight for headings

## API Integration

The application communicates with the backend at `http://localhost:3001/api`:

### Endpoints Used
- `POST /interview-prep/profile` - Create/update profile
- `GET /interview-prep/profile` - Fetch user profile
- `POST /interview-prep/jd/upload` - Upload job description
- `GET /interview-prep/jd` - Fetch job descriptions
- `POST /interview-prep/plan/generate` - Generate interview plan
- `GET /interview-prep/plan` - Fetch latest plan

## Styling

Uses Tailwind CSS with custom theme configuration. Colors and spacing are defined through CSS variables in `globals.css` for easy theming.

## Performance

- Server-side rendering for SEO
- Optimized images
- Code splitting
- CSS-in-JS for dynamic styling

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - Jarvis Learning Platform
