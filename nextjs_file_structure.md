# MyHealth Guide - Next.js 14 File Structure (Updated)

## Project Root Structure

```
myhealthguide/
├── .env.local                     # Environment variables (CONFIGURED IN VERCEL)
├── .env.example                   # Example env file for GitHub
├── .gitignore                     # Git ignore patterns
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration (ELDERCARE OPTIMIZED)
├── tsconfig.json                  # TypeScript configuration
├── README.md                      # Project documentation
├── user-requirements.md           # Complete user requirements document
│
├── public/                        # Static assets
│   ├── favicon.ico
│   ├── logo.svg                   # MyHealth Guide logo
│   └── icons/                     # Professional SVG icons (ELDERCARE-FOCUSED)
│       ├── medication-check.svg   # Search + medical cross
│       ├── health-qa.svg          # Question mark circle
│       ├── user-account.svg       # User profile
│       ├── pill.svg               # Medication icon
│       ├── security.svg           # Shield with lock
│       ├── success.svg            # Check mark
│       ├── warning.svg            # Warning triangle
│       ├── danger.svg             # Alert bell
│       ├── info.svg               # Info circle
│       ├── plus.svg               # Add icon
│       └── hamburger.svg          # Mobile menu icon
│
├── src/                           # Source code directory
│   ├── app/                       # Next.js 14 App Router
│   │   ├── globals.css            # Global styles with LARGE FONTS for eldercare
│   │   ├── layout.tsx             # Root layout with responsive header/footer
│   │   ├── page.tsx               # Landing page with auth gate
│   │   ├── loading.tsx            # Global loading component
│   │   ├── error.tsx              # Global error boundary
│   │   │
│   │   ├── auth/                  # Authentication pages
│   │   │   ├── page.tsx           # Single-page auth toggle (signup/login)
│   │   │   └── loading.tsx        # Auth loading state
│   │   │
│   │   ├── dashboard/             # User dashboard
│   │   │   ├── page.tsx           # Dashboard with 3 cards (SIMPLIFIED)
│   │   │   └── loading.tsx        # Dashboard loading
│   │   │
│   │   ├── medication-check/      # Medication checking feature (PRIMARY)
│   │   │   ├── page.tsx           # Step-by-step medication input
│   │   │   ├── results/           # AI results page
│   │   │   │   └── page.tsx       # Traffic light results display
│   │   │   └── loading.tsx        # Medication check loading
│   │   │
│   │   ├── health-qa/             # Health Q&A feature  
│   │   │   ├── page.tsx           # Health questions interface
│   │   │   └── loading.tsx        # Q&A loading state
│   │   │
│   │   ├── medical-disclaimer/     # Medical disclaimer page (COMPLIANCE)
│   │   │   ├── page.tsx           # HIPAA/FDA compliance disclaimer
│   │   │   └── loading.tsx        # Disclaimer loading
│   │   │
│   │   ├── privacy/               # Privacy and legal pages
│   │   │   ├── page.tsx           # Privacy policy page
│   │   │   └── unsubscribe/       # Email unsubscribe management
│   │   │       └── page.tsx       # Unsubscribe preferences
│   │   │
│   │   └── api/                   # API routes (CONFIGURED FOR VERCEL)
│   │       ├── auth/              # Authentication endpoints
│   │       │   ├── signup/
│   │       │   │   └── route.ts   # POST /api/auth/signup
│   │       │   ├── login/
│   │       │   │   └── route.ts   # POST /api/auth/login
│   │       │   └── reset-password/
│   │       │       └── route.ts   # POST /api/auth/reset-password
│   │       │
│   │       ├── medication/        # Medication checking APIs (MEDGEMMA READY)
│   │       │   ├── check/
│   │       │   │   └── route.ts   # POST /api/medication/check
│   │       │   └── search/
│   │       │       └── route.ts   # GET /api/medication/search
│   │       │
│   │       ├── health-qa/         # Health Q&A API (MEDGEMMA READY)
│   │       │   └── route.ts       # POST /api/health-qa
│   │       │
│   │   ├── account/               # User account management
│   │   │   ├── page.tsx           # Account settings
│   │   │   └── loading.tsx        # Account loading
│   │   │
│   │       ├── email/             # Email sending API (RESEND CONFIGURED)
│   │       │   ├── welcome/
│   │       │   │   └── route.ts   # POST /api/email/welcome
│   │       │   └── reset/
│   │       │       └── route.ts   # POST /api/email/reset
│   │       │
│   │   ├── components/                # Reusable UI components (ELDERCARE-OPTIMIZED)
│   │   │   ├── legal/                 # Legal and compliance components
│   │   │   │   ├── MedicalDisclaimer.tsx  # HIPAA/FDA disclaimer page
│   │   │   │   ├── DisclaimerModal.tsx    # Session-based disclaimer
│   │   │   │   ├── PrivacyLinks.tsx       # Footer privacy links
│   │   │   │   └── UnsubscribeForm.tsx    # Email preferences
│   │   │   │
│   │   ├── ui/                    # Basic UI components
│   │   │   ├── Button.tsx         # Large, high-contrast buttons
│   │   │   ├── Input.tsx          # Large font form inputs
│   │   │   ├── Modal.tsx          # Accessible modal/dialog
│   │   │   ├── Card.tsx           # Dashboard card component
│   │   │   ├── Icon.tsx           # Professional SVG icon wrapper
│   │   │   └── Message.tsx        # User-friendly success/error messages
│   │   │
│   │   ├── layout/                # Layout components (RESPONSIVE)
│   │   │   ├── Header.tsx         # Responsive header with hamburger menu
│   │   │   ├── Footer.tsx         # Simple, accessible footer
│   │   │   ├── Navigation.tsx     # Desktop/mobile navigation
│   │   │   └── MobileMenu.tsx     # Hamburger menu component
│   │   │
│   │   ├── auth/                  # Authentication components
│   │   │   ├── AuthGate.tsx       # Authentication gate modal
│   │   │   ├── AuthToggle.tsx     # Single-page signup/login toggle
│   │   │   ├── SignupForm.tsx     # Progressive onboarding form
│   │   │   ├── LoginForm.tsx      # Simple login form
│   │   │   └── PasswordReset.tsx  # Password reset form
│   │   │
│   │   ├── medication/            # Medication-related components (AI + VOICE)
│   │   │   ├── MedicationForm.tsx # Step-by-step input with voice
│   │   │   ├── VoiceMedicationInput.tsx # Voice-powered medication entry
│   │   │   ├── MedicationList.tsx # Visual medication list with pills
│   │   │   ├── MedicationItem.tsx # Individual medication with icon
│   │   │   ├── ConflictResults.tsx# Traffic light AI results + TTS
│   │   │   ├── VoiceResults.tsx   # Voice-enabled results reading
│   │   │   └── ResultCard.tsx     # Individual result card
│   │   │
│   │   └── dashboard/             # Dashboard components (SIMPLIFIED)
│   │       ├── DashboardGrid.tsx  # 3-card grid layout
│   │       ├── FeatureCard.tsx    # Large, clickable feature cards
│   │       └── WelcomeMessage.tsx # Personalized welcome message
│   │
│   ├── lib/                       # Utility functions and configurations
│   │   ├── firebase/              # Firebase configuration (VERCEL READY)
│   │   │   ├── config.ts          # Firebase app configuration
│   │   │   ├── auth.ts            # Authentication functions
│   │   │   └── firestore.ts       # Database functions
│   │   │
│   │   ├── ai/                    # AI integration (MEDGEMMA CONFIGURED)
│   │   │   ├── medgemma.ts        # MedGemma API integration
│   │   │   ├── medication-check.ts# Medication conflict detection
│   │   │   └── health-qa.ts       # Health Q&A functions
│   │   │
│   │   ├── email/                 # Email services (RESEND CONFIGURED)
│   │   │   ├── resend.ts          # Resend API configuration
│   │   │   ├── templates.ts       # Professional email templates
│   │   │   └── sender.ts          # admin@myguide.health sender
│   │   │
│   │   ├── utils/                 # General utilities
│   │   │   ├── validation.ts      # Form validation schemas (elderly-friendly)
│   │   │   ├── constants.ts       # App constants and medical disclaimers
│   │   │   ├── helpers.ts         # Helper functions
│   │   │   └── accessibility.ts   # Accessibility utilities
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │       ├── useAuth.ts         # Authentication hook
│   │       ├── useMedication.ts   # Medication management hook
│   │       ├── useResponsive.ts   # Responsive design hook
│   │       ├── useVoice.ts        # Voice recognition & synthesis hook
│   │       ├── useSpeech.ts       # Text-to-speech functionality
│   │       └── useLocalStorage.ts # Local storage hook
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── auth.ts                # Authentication types
│   │   ├── medication.ts          # Medication and AI response types
│   │   ├── api.ts                 # API response types
│   │   ├── user.ts                # User data types
│   │   └── ui.ts                  # UI component types
│   │
│   └── styles/                    # Additional styling
│       ├── components.css         # Component-specific styles
│       ├── eldercare.css          # Eldercare-specific styling
│       └── responsive.css         # Mobile-first responsive utilities
```

## CONFIGURED SERVICES (READY TO USE)

### ✅ MedGemma (Google Vertex AI)
- **Status:** Configured in Vercel
- **API Endpoint:** Google Cloud Vertex AI
- **Usage:** Medication conflict detection and health Q&A
- **Integration:** `/src/lib/ai/medgemma.ts`

### ✅ Resend Email Service
- **Status:** Configured in Vercel
- **Sender:** admin@myguide.health
- **Usage:** Welcome emails, password resets
- **Integration:** `/src/lib/email/resend.ts`

### ✅ Firebase Authentication
- **Status:** Configured in Vercel
- **Features:** Email/password auth, user management
- **Usage:** User authentication and session management
- **Integration:** `/src/lib/firebase/auth.ts`

### ✅ Vercel Deployment
- **Status:** Ready for deployment
- **Domain:** myguide.health
- **Environment:** All variables configured
- **Git:** Connected to GitHub repository

## ELDERCARE-SPECIFIC CONFIGURATIONS

### Tailwind Config (eldercare.js)
```javascript
module.exports = {
  theme: {
    extend: {
      fontSize: {
        'elder-xs': '1.1rem',     // Minimum readable size
        'elder-sm': '1.2rem',     // Small text
        'elder-base': '1.3rem',   // Base text
        'elder-lg': '1.6rem',     // Large text
        'elder-xl': '2rem',       // Headings
        'elder-2xl': '2.4rem',    // Large headings
      },
      spacing: {
        'touch': '44px',          // Minimum touch target
        'elder-gap': '2rem',      // Generous spacing
      },
      colors: {
        // High contrast color system
        'elder-text': '#1a202c',
        'elder-bg': '#ffffff',
        'elder-primary': '#3182ce',
        'elder-success': '#38a169',
        'elder-warning': '#ed8936',
        'elder-danger': '#e53e3e',
      }
    },
  },
}
```

## 2-DAY IMPLEMENTATION PRIORITY

### Day 1 Files (Authentication & UI Core)
```
CRITICAL PATH:
1. src/app/layout.tsx              # Root layout
2. src/app/page.tsx                # Landing page with auth gate
3. src/components/layout/Header.tsx # Responsive header
4. src/components/auth/AuthGate.tsx # Authentication modal
5. src/components/auth/AuthToggle.tsx # Single-page auth
6. src/lib/firebase/config.ts      # Firebase setup
7. src/app/auth/page.tsx           # Auth page
8. src/app/api/auth/signup/route.ts # Signup API
9. src/app/api/auth/login/route.ts  # Login API
10. tailwind.config.js             # Eldercare styling
```

### Day 2 Files (AI Integration & Polish)
```
CRITICAL PATH:
1. src/app/dashboard/page.tsx      # User dashboard
2. src/app/medication-check/page.tsx # Medication input
3. src/lib/ai/medgemma.ts          # AI integration
4. src/app/api/medication/check/route.ts # AI API
5. src/components/medication/ConflictResults.tsx # Results display
6. src/app/api/email/welcome/route.ts # Email integration
7. src/components/ui/Message.tsx    # User feedback
8. Mobile responsiveness testing
9. Final deployment and testing
```

## READY FOR DEVELOPMENT

### Prerequisites Met ✅
- [x] **Vercel account** with domain configured
- [x] **MedGemma API** integrated and tested
- [x] **Resend email** service configured
- [x] **Firebase project** set up with authentication
- [x] **GitHub repository** ready for code
- [x] **Environment variables** configured in Vercel

### Next Steps
1. **Clone/initialize** Next.js project with this structure
2. **Follow Day 1** implementation priority
3. **Test authentication** flow thoroughly
4. **Implement Day 2** AI features
5. **Deploy and validate** eldercare accessibility

## Project Root Structure

```
myhealthguide/
├── .env.local                     # Environment variables (Firebase, Resend, etc.)
├── .env.example                   # Example env file for GitHub
├── .gitignore                     # Git ignore patterns
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration (if using TS)
├── README.md                      # Project documentation
│
├── public/                        # Static assets
│   ├── favicon.ico
│   ├── logo.svg                   # MyHealth Guide logo
│   └── icons/                     # Professional SVG icons
│       ├── medication-check.svg   # Search + medical cross
│       ├── health-qa.svg          # Question mark circle
│       ├── user-account.svg       # User profile
│       ├── pill.svg               # Medication icon
│       ├── security.svg           # Shield with lock
│       ├── success.svg            # Check mark
│       ├── warning.svg            # Warning triangle
│       ├── danger.svg             # Alert bell
│       ├── info.svg               # Info circle
│       └── plus.svg               # Add icon
│
├── src/                           # Source code directory
│   ├── app/                       # Next.js 14 App Router
│   │   ├── globals.css            # Global styles and Tailwind
│   │   ├── layout.tsx             # Root layout with header/footer
│   │   ├── page.tsx               # Landing page (homepage)
│   │   ├── loading.tsx            # Global loading component
│   │   ├── error.tsx              # Global error boundary
│   │   │
│   │   ├── auth/                  # Authentication pages
│   │   │   ├── page.tsx           # Auth toggle page (signup/login)
│   │   │   └── loading.tsx        # Auth loading state
│   │   │
│   │   ├── dashboard/             # User dashboard
│   │   │   ├── page.tsx           # Dashboard with 3 cards
│   │   │   └── loading.tsx        # Dashboard loading
│   │   │
│   │   ├── medication-check/      # Medication checking feature
│   │   │   ├── page.tsx           # Medication input form
│   │   │   ├── results/           # Results page
│   │   │   │   └── page.tsx       # AI results display
│   │   │   └── loading.tsx        # Medication check loading
│   │   │
│   │   ├── health-qa/             # Health Q&A feature  
│   │   │   ├── page.tsx           # Health questions interface
│   │   │   └── loading.tsx        # Q&A loading state
│   │   │
│   │   ├── account/               # User account management
│   │   │   ├── page.tsx           # Account settings
│   │   │   └── loading.tsx        # Account loading
│   │   │
│   │   └── api/                   # API routes (serverless functions)
│   │       ├── auth/              # Authentication endpoints
│   │       │   ├── signup/
│   │       │   │   └── route.ts   # POST /api/auth/signup
│   │       │   ├── login/
│   │       │   │   └── route.ts   # POST /api/auth/login
│   │       │   └── reset-password/
│   │       │       └── route.ts   # POST /api/auth/reset-password
│   │       │
│   │       ├── medication/        # Medication checking APIs
│   │       │   ├── check/
│   │       │   │   └── route.ts   # POST /api/medication/check
│   │       │   └── search/
│   │       │       └── route.ts   # GET /api/medication/search
│   │       │
│   │       ├── health-qa/         # Health Q&A API
│   │       │   └── route.ts       # POST /api/health-qa
│   │       │
│   │       └── email/             # Email sending API
│   │           ├── welcome/
│   │           │   └── route.ts   # POST /api/email/welcome
│   │           └── reset/
│   │               └── route.ts   # POST /api/email/reset
│   │
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Basic UI components
│   │   │   ├── Button.tsx         # Reusable button component
│   │   │   ├── Input.tsx          # Form input component
│   │   │   ├── Modal.tsx          # Modal/dialog component
│   │   │   ├── Card.tsx           # Dashboard card component
│   │   │   ├── Icon.tsx           # SVG icon wrapper
│   │   │   └── Message.tsx        # Success/error message component
│   │   │
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx         # Site header with nav
│   │   │   ├── Footer.tsx         # Site footer
│   │   │   └── Navigation.tsx     # Navigation component
│   │   │
│   │   ├── auth/                  # Authentication components
│   │   │   ├── AuthGate.tsx       # Authentication gate modal
│   │   │   ├── AuthToggle.tsx     # Signup/login toggle
│   │   │   ├── SignupForm.tsx     # User registration form
│   │   │   ├── LoginForm.tsx      # User login form
│   │   │   └── PasswordReset.tsx  # Password reset form
│   │   │
│   │   ├── medication/            # Medication-related components
│   │   │   ├── MedicationForm.tsx # Add medication form
│   │   │   ├── MedicationList.tsx # List of user medications
│   │   │   ├── MedicationItem.tsx # Individual medication item
│   │   │   ├── ConflictResults.tsx# AI conflict results display
│   │   │   └── ResultCard.tsx     # Individual result card
│   │   │
│   │   └── dashboard/             # Dashboard components
│   │       ├── DashboardGrid.tsx  # 3-card grid layout
│   │       ├── FeatureCard.tsx    # Individual feature card
│   │       └── WelcomeMessage.tsx # Welcome message for users
│   │
│   ├── lib/                       # Utility functions and configurations
│   │   ├── firebase/              # Firebase configuration
│   │   │   ├── config.ts          # Firebase app configuration
│   │   │   ├── auth.ts            # Authentication functions
│   │   │   └── firestore.ts       # Database functions
│   │   │
│   │   ├── ai/                    # AI integration
│   │   │   ├── medgemma.ts        # MedGemma API integration
│   │   │   └── health-qa.ts       # Health Q&A functions
│   │   │
│   │   ├── email/                 # Email services
│   │   │   ├── resend.ts          # Resend API configuration
│   │   │   └── templates.ts       # Email templates
│   │   │
│   │   ├── utils/                 # General utilities
│   │   │   ├── validation.ts      # Form validation schemas
│   │   │   ├── constants.ts       # App constants
│   │   │   └── helpers.ts         # Helper functions
│   │   │
│   │   └── hooks/                 # Custom React hooks
│   │       ├── useAuth.ts         # Authentication hook
│   │       ├── useMedication.ts   # Medication management hook
│   │       └── useLocalStorage.ts # Local storage hook
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── auth.ts                # Authentication types
│   │   ├── medication.ts          # Medication-related types
│   │   ├── api.ts                 # API response types
│   │   └── user.ts                # User data types
│   │
│   └── styles/                    # Additional styling
│       ├── components.css         # Component-specific styles
│       └── utilities.css          # Custom utility classes
```

## Key Configuration Files

### `.env.local` (Environment Variables)
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Email Service (Resend)
RESEND_API_KEY=your_resend_key

# Google Cloud / MedGemma
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_CREDENTIALS=your_service_account_json

# App Configuration
NEXT_PUBLIC_APP_URL=https://myguide.health
```

### `package.json` (Key Dependencies)
```json
{
  "name": "myhealthguide",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "firebase": "^10.0.0",
    "firebase-admin": "^11.0.0",
    "resend": "^2.0.0",
    "@google-cloud/aiplatform": "^3.0.0",
    "tailwindcss": "^3.4.0",
    "react-hook-form": "^7.45.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### `tailwind.config.js` (Eldercare-Focused Design)
```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'elder-sm': '1.2rem',    // Minimum font size
        'elder-base': '1.3rem',  // Base text
        'elder-lg': '1.6rem',    // Large text
        'elder-xl': '2rem',      // Headings
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3182ce',
          700: '#1a365d',
        },
        success: '#38a169',
        warning: '#ed8936',
        danger: '#e53e3e',
      }
    },
  },
  plugins: [],
}
```

## File Implementation Priority (2-Day Sprint)

### Day 1 Priority Files
```
1. src/app/layout.tsx           # Root layout
2. src/app/page.tsx             # Landing page  
3. src/components/layout/Header.tsx
4. src/components/layout/Footer.tsx
5. src/components/auth/AuthGate.tsx
6. src/components/auth/AuthToggle.tsx
7. src/lib/firebase/config.ts
8. src/lib/firebase/auth.ts
9. src/app/auth/page.tsx
10. src/app/api/auth/signup/route.ts
11. src/app/api/auth/login/route.ts
```

### Day 2 Priority Files
```
1. src/app/dashboard/page.tsx
2. src/components/medication/MedicationForm.tsx
3. src/app/medication-check/page.tsx
4. src/app/api/medication/check/route.ts
5. src/lib/ai/medgemma.ts
6. src/components/medication/ConflictResults.tsx
7. src/app/api/email/welcome/route.ts
8. src/lib/email/resend.ts
```

## Migration Strategy from Current Setup

1. **Backup current files** from your existing HTML/JS setup
2. **Extract reusable assets** (images, icons, content)
3. **Initialize Next.js project** with this structure
4. **Migrate Firebase config** to new lib structure  
5. **Convert HTML components** to React components
6. **Test authentication flow** before adding MedGemma

This structure prioritizes:
- **Elder-friendly design** with large fonts and clear navigation
- **Security-first approach** with authentication gates
- **Scalable architecture** for future mobile app integration
- **Clean separation** of concerns for easier debugging
- **AI-ready infrastructure** for MedGemma integration