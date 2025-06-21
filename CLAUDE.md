# MyHealth Guide - Coding Standards & Conventions

## Project Overview
MyHealth Guide is an eldercare-focused health platform providing AI-powered medication conflict detection. This document outlines coding standards, conventions, and important reminders for maintaining production-ready code.

## 🎯 Core Principles
1. **Eldercare-First**: Every design decision prioritizes elderly users (65+ years)
2. **Accessibility**: WCAG 2.1 AA compliance is mandatory
3. **Simplicity**: Clear, simple code that's easy to maintain
4. **Safety**: Medical information requires extra care and disclaimers

## 📋 Coding Standards

### TypeScript Standards
```typescript
// ✅ GOOD: Explicit types and interfaces
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

// ❌ BAD: Any types or implicit returns
const handleClick = (data: any) => { /* ... */ }
```

- **Strict mode** enabled in tsconfig.json
- **Explicit return types** for all functions
- **Interface over type** for object shapes
- **Proper error handling** with try-catch blocks
- **No any types** - use unknown if type is truly unknown

### Component Standards
```typescript
// ✅ GOOD: Clear structure with props interface
interface HeaderProps {
  user?: User;
  onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps): JSX.Element {
  return (
    <header role="banner" aria-label="Main navigation">
      {/* Component content */}
    </header>
  );
}

// ❌ BAD: No types, unclear structure
export default function header(props) {
  return <div>{/* content */}</div>
}
```

- **Functional components only** (no class components)
- **Props interfaces** defined above component
- **Destructured props** in parameters
- **Named exports** for better tree-shaking
- **JSDoc comments** for complex components

### Accessibility Standards
```typescript
// ✅ GOOD: Semantic HTML with ARIA labels
<button
  aria-label="Add medication"
  aria-describedby="add-medication-help"
  className="min-h-[44px] min-w-[44px]" // Touch target size
>
  <span className="sr-only">Add medication</span>
  <PlusIcon aria-hidden="true" />
</button>

// ❌ BAD: Div with onClick, no accessibility
<div onClick={handleClick}>Click me</div>
```

- **Semantic HTML elements** (button, nav, main, etc.)
- **ARIA labels** for all interactive elements
- **Keyboard navigation** support (Tab, Enter, Escape)
- **Focus indicators** always visible
- **Screen reader text** for icon-only buttons

### Eldercare-Specific Standards
```css
/* ✅ GOOD: Large, readable sizes */
.text-base { font-size: 1.2rem; } /* 19.2px minimum */
.button { min-height: 44px; }     /* Touch target */

/* ❌ BAD: Small sizes */
.text-sm { font-size: 0.875rem; } /* Too small */
```

- **Minimum font size**: 1.2rem (19.2px)
- **Touch targets**: 44px × 44px minimum
- **Color contrast**: 4.5:1 ratio minimum
- **Line height**: 1.6 or higher for readability
- **Clear language**: No medical jargon in UI

### File Organization
```
src/
├── app/                    # Next.js app router pages
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/           # Layout components
│   ├── auth/             # Authentication components
│   └── medication/       # Feature-specific components
├── lib/                   # Utilities and configurations
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

- **One component per file**
- **Co-located styles** (CSS-in-JS with Tailwind)
- **Index files** for clean imports
- **Consistent naming**: PascalCase for components

## 🏗️ Architecture Patterns

### API Route Pattern
```typescript
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate input
    // Process request
    // Return response
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Handling Pattern
```typescript
// Always provide user-friendly error messages
try {
  await checkMedications(medications);
} catch (error) {
  console.error('Medication check failed:', error);
  setError('Unable to check medications. Please try again.');
}
```

### Loading States Pattern
```typescript
// Always show loading states for better UX
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await submitForm();
  } finally {
    setIsLoading(false);
  }
};
```

## 🚀 Performance Standards

### Bundle Size
- **Lazy load** heavy components
- **Dynamic imports** for features
- **Tree shaking** with named exports
- **Optimize images** with next/image

### Core Web Vitals
- **LCP**: < 2.5 seconds
- **FID**: < 100 milliseconds
- **CLS**: < 0.1

## 🔒 Security Standards

### API Security
```typescript
// ✅ GOOD: Validate all inputs
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const validatedData = schema.parse(body);

// ❌ BAD: Direct usage without validation
const { email, password } = body;
```

### Environment Variables
```typescript
// ✅ GOOD: Type-safe env access
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  // ...
};

// ❌ BAD: Direct process.env access
const key = process.env.FIREBASE_KEY;
```

## 🧪 Testing Standards

### Component Testing
- Test user interactions
- Test accessibility features
- Test error states
- Test loading states

### E2E Testing Scenarios
1. Elderly user can complete signup
2. Voice input works correctly
3. Medication checking returns results
4. Mobile navigation is accessible

## 📝 Documentation Standards

### Component Documentation
```typescript
/**
 * Button component with eldercare-optimized styling
 * 
 * @example
 * <Button variant="primary" size="large" onClick={handleClick}>
 *   Check Medications
 * </Button>
 */
```

### API Documentation
```typescript
/**
 * POST /api/medication/check
 * 
 * Checks medication conflicts using MedGemma AI
 * 
 * @body {medications: Array<{name: string, dosage?: string}>}
 * @returns {conflicts: Array<ConflictResult>}
 */
```

## 🎨 UI/UX Standards

### Color Palette
```typescript
const colors = {
  primary: '#3182ce',    // Blue - primary actions
  success: '#38a169',    // Green - safe/success
  warning: '#ed8936',    // Orange - minor warnings
  danger: '#e53e3e',     // Red - serious warnings
  text: '#1a202c',       // Dark gray - main text
  background: '#ffffff', // White - backgrounds
};
```

### Responsive Breakpoints
```typescript
const breakpoints = {
  mobile: '0px',      // Mobile-first
  tablet: '768px',    // iPad portrait
  desktop: '1024px',  // Desktop
};
```

## 🔧 Development Workflow

### Git Commit Messages
```
feat: add voice input for medications
fix: improve contrast on button hover
docs: update README with setup instructions
style: format code with prettier
refactor: extract medication form logic
test: add voice input integration tests
```

### PR Checklist
- [ ] Accessibility tested with screen reader
- [ ] Mobile responsive tested
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] TypeScript errors resolved
- [ ] Console errors cleared

## 🚨 Important Reminders

### Medical Disclaimers
- **ALWAYS** include disclaimers with AI responses
- **NEVER** provide definitive medical advice
- **ALWAYS** recommend consulting healthcare providers

### Eldercare Focus
- **TEST** with actual elderly users when possible
- **CONSIDER** arthritis when designing interactions
- **PROVIDE** voice alternatives for typing
- **USE** clear, non-technical language

### Performance
- **OPTIMIZE** for slow 3G connections
- **MINIMIZE** JavaScript bundle size
- **LAZY LOAD** non-critical features
- **CACHE** appropriate resources

## 📊 Metrics to Track

### User Experience
- Time to complete signup: < 2 minutes
- Medication check response: < 5 seconds
- Error recovery success rate: > 90%

### Technical Metrics
- Lighthouse score: > 90
- Bundle size: < 200KB initial
- API response time: < 1 second

## 🛠️ Tools & Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Quality
```bash
npm run format       # Format with Prettier
npm run test         # Run tests
npm run test:e2e     # Run E2E tests
npm run analyze      # Analyze bundle size
```

## 📚 Resources

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Eldercare Design
- [Designing for Older Adults](https://www.nngroup.com/articles/designing-for-older-adults/)
- [Accessibility for Seniors](https://www.w3.org/WAI/older-users/)

### Medical Compliance
- [HIPAA Developer Guide](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [FDA Software Guidelines](https://www.fda.gov/medical-devices/digital-health)

---

**Remember**: We're building for elderly users who need our help managing their health. Every line of code should make their lives easier and safer.