# myguide.health - Caregiver Webapp

[![Tests](https://github.com/qashsolutions/myhealthguide/actions/workflows/tests.yml/badge.svg)](https://github.com/qashsolutions/myhealthguide/actions/workflows/tests.yml)

Production-ready caregiving management platform with voice-powered logging, AI insights, and real-time collaboration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and add your credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and fill in:
- Firebase credentials
- Stripe API keys
- Twilio credentials (for SMS)
- Google Cloud API keys (Speech-to-Text, Gemini)
- Cloudflare Turnstile keys
- Email service credentials (SendGrid/AWS SES)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📦 What's Included (Phase 1 + 2)

### ✅ Phase 1: Foundation & Authentication
- [x] Next.js 14 with TypeScript
- [x] Tailwind CSS + shadcn/ui components
- [x] Firebase configuration (Auth, Firestore, Storage)
- [x] Public website (header, footer, landing page)
- [x] Authentication pages (login, signup)
- [x] Dashboard layout with sidebar
- [x] Theme system (light/dark mode)
- [x] Type definitions for all entities

### ✅ Phase 2: Core Care Tracking
- [x] Elder management pages
- [x] Medication tracking pages
- [x] Supplement management pages
- [x] Diet logging pages
- [x] Firebase services (CRUD operations)
- [x] Form validation with react-hook-form + zod

## 🔧 To Complete

### Firebase Integration
The Firebase services are ready but need credentials:
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Add Firebase credentials to `.env.local`

### Additional Services
Set up these services and add credentials:
- **Stripe** (payments) - https://stripe.com
- **Twilio** (SMS) - https://twilio.com
- **Google Cloud** (Speech-to-Text, Gemini AI)
- **Cloudflare Turnstile** (bot protection)
- **SendGrid or AWS SES** (email)

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State Management**: Zustand + React Query
- **Forms**: react-hook-form + zod
- **Icons**: lucide-react
- **Deployment**: Vercel

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public pages (landing, features, etc.)
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # Theme provider
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── shared/            # Shared components (Header, Footer, Sidebar)
│   └── care/              # Care-specific components (coming)
├── lib/
│   ├── firebase/          # Firebase services
│   ├── utils/             # Utility functions
│   └── notifications/     # OTP and notification services
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
└── store/                 # Zustand stores (coming)
```

## 🔐 Security

- Environment variables for sensitive data
- Phone number hashing for trial tracking
- Firebase security rules (to be configured)
- HTTPS only in production

## 🚢 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Build for Production

```bash
npm run build
npm start
```

## 📖 Next Steps

1. **Add Firebase credentials** - Enable authentication and database
2. **Test authentication flow** - Login, signup, session management
3. **Implement CRUD operations** - Connect UI to Firebase services
4. **Add external services** - Stripe, Twilio, Google Cloud APIs
5. **Phase 3: Voice Input** - Implement voice logging
6. **Phase 4: AI Integration** - Add Gemini AI summaries
7. **Phase 5+**: SMS notifications, groups, agency features, payments

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run test` - Run Jest unit tests
- `npm run test:rules` - Run Firestore security rules tests (requires emulator)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:smoke` - Run quick smoke tests
- `npm run test:e2e:ui` - Run E2E tests with interactive UI

## 🆘 Support

- Review documentation in project root (.md files)
- Check Firebase documentation: https://firebase.google.com/docs
- Next.js documentation: https://nextjs.org/docs

## ⚖️ License

Private - All rights reserved

---

Built with ❤️ for better caregiving
