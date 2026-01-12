# Jarvis Interview Prep - Design System

## Overview
This document describes the design system and visual guidelines for the Jarvis Interview Prep application.

## Vision
Empower users to prepare effectively for their interviews with clear, focused, and motivating UI.

## Core Principles
- **Clarity**: Keep information structured and easy to scan
- **Progress**: Make preparation milestones visible
- **Trust**: Use consistent patterns and clear hierarchy
- **Efficiency**: Guide users through the prep journey with minimal friction

## Color Palette

### Primary Colors
- **Primary (Indigo)**: `hsl(242 84% 60%)`
  - Usage: CTAs, primary actions, highlights
  - Accessible contrast ratios maintained

- **Accent (Emerald)**: `hsl(160 84% 40%)`
  - Usage: Success states, completion indicators
  - Subtle gradients with primary

### Neutral Colors
- **Background**: `oklch(1 0 0)` - Pure white
- **Foreground**: `oklch(0.13 0.028 261.692)` - Dark blue-gray
- **Border**: `oklch(0.928 0.006 264.531)` - Light gray
- **Muted**: `oklch(0.967 0.003 264.542)` - Very light gray

### Semantic Colors
- **Destructive**: `oklch(0.577 0.245 27.325)` - Red for errors/warnings
- **Success**: Green variants for completion
- **Info**: Blue for information
- **Warning**: Orange for caution

## Typography

### Font Stack
- Primary: System sans-serif (San Francisco, Segoe UI, Roboto)
- Mono: Monospace for code snippets

### Sizing & Weight
- **H1 (Hero)**: 28px, 700 weight
- **H2 (Page Title)**: 24px, 700 weight
- **H3 (Section)**: 18px, 600 weight
- **H4 (Subsection)**: 16px, 600 weight
- **Body**: 14px, 400 weight
- **Small**: 12px, 400 weight
- **Caption**: 11px, 500 weight

### Line Heights
- Headings: 1.2
- Body: 1.5
- Captions: 1.4

## Spacing

### Scale (8px base)
- `xs`: 2px
- `sm`: 4px
- `md`: 8px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px
- `3xl`: 48px

## Border Radius
- **Base**: 10px (CSS variable: `--radius`)
- **Small**: 6px (base - 4px)
- **Medium**: 8px (base - 2px)
- **Large**: 14px (base + 4px)

## Components

### Button
- **Default**: Indigo background, white text
- **Outline**: Border only, transparent background
- **Ghost**: No background, hover effect
- **Sizes**: sm (32px), md (36px), lg (40px)
- **Radius**: 6px
- **Disabled State**: 50% opacity

### Card
- **Background**: White with subtle shadow
- **Border**: 1px gray-200
- **Padding**: 24px (6 × 4px unit)
- **Radius**: 8px
- **Hover**: Minimal shadow increase on interactive cards

### Input / Textarea
- **Border**: 1px gray-300
- **Focus**: Blue ring (3px, 50% opacity)
- **Padding**: 8px 12px
- **Radius**: 6px
- **Placeholder**: Gray-500

### Badge
- **Default**: Indigo background, white text
- **Outline**: Gray border, gray text
- **Padding**: 4px 10px
- **Radius**: 9999px (fully rounded)
- **Font Size**: 12px, 600 weight

### Progress Bar
- **Background**: Light gray
- **Fill**: Indigo
- **Height**: 4px
- **Radius**: 9999px

## Patterns

### Page Layout
1. **Sticky Navigation** (top)
2. **Hero/Header** with title and description
3. **Quick Stats/Cards** (grid-based)
4. **Main Content Area**
5. **Action Buttons** (footer)

### Form Pattern
- Label above input (flush left)
- Helper text below input
- Validation messages in red (destructive color)
- Submit buttons full-width on mobile, auto width on desktop

### Card Hierarchy
- **Primary Cards**: Full-width, elevated content
- **Secondary Cards**: Grid layout, equal prominence
- **Tertiary Cards**: Inline, minimal styling

### State Indicators
- **Loading**: Spinner with progress messaging
- **Success**: Green checkmark, confirmation message
- **Error**: Red warning icon, error message
- **Empty State**: Icon (40×40), headline, description

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Guidelines
- Stack cards vertically on mobile
- Use 1-2 columns on tablet
- Use 2-3 columns on desktop
- Full-width inputs/buttons on mobile
- Adjust font sizes: base on mobile, +2-4px on desktop

## Animations

### Transitions
- **Color changes**: 150ms ease
- **Opacity changes**: 200ms ease
- **Transform**: 300ms ease-out

### Loading State
- Spinner: 1s rotation, linear infinite
- Pulse animation: 2s opacity oscillation

### No Animation
- Prefers reduced motion respected
- Uses `@media (prefers-reduced-motion: reduce)`

## Accessibility

### Contrast Ratios
- Large text: 3:1 minimum
- Normal text: 4.5:1 minimum
- UI components: 3:1 minimum

### Focus States
- 3px ring in primary color
- Visible on all interactive elements
- 50% opacity to maintain background visibility

### Screen Reader Support
- Semantic HTML used throughout
- ARIA labels for icons
- Form labels properly associated

## Icons

### Lucide React Icons
- Size: 16-24px typically
- Color: Inherit from parent
- Spacing: 8px gap from text

### Common Icons
- Plus/Add: Add new items
- Edit: Modify existing
- Trash: Delete
- Save: Confirm changes
- Check: Success/completion
- X/Close: Cancel/dismiss
- Arrow: Navigation

## Dark Mode (Future)

CSS variables support dark mode with `@media (prefers-color-scheme: dark)`:
- Background: `oklch(0.13 0.028 261.692)`
- Foreground: `oklch(1 0 0)`
- Adjust all other colors accordingly

## Implementation Notes

- All colors defined as CSS variables in `src/app/globals.css`
- Tailwind configuration maps these variables
- Use utility classes for responsive breakpoints
- Maintain consistent spacing with 8px grid
- Test contrast ratios with accessibility tools
- Use semantic HTML for better a11y
