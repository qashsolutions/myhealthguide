# Phase 1: Foundation & Authentication - Caregiver Webapp

## Overview
**Duration**: Week 1 (5-7 days)  
**Goal**: Set up project infrastructure, implement authentication system, and create basic dashboard layout

## Deliverables
✅ Next.js project with TypeScript, Tailwind CSS, and shadcn/ui  
✅ Firebase configuration (Auth, Firestore, Storage)  
✅ Cloudflare Turnstile + dual OTP authentication (email + SMS)  
✅ Basic dashboard layout with sidebar navigation  
✅ User and group creation flows  
✅ Theme system (light/dark mode)  
✅ Trial tracking system  

---

## Task 1.1: Project Initialization & Setup

### Objective
Create a production-ready Next.js application with all required dependencies and configurations.

### Steps

#### 1. Initialize Next.js Project
```bash
npx create-next-app@latest caregiver-webapp --typescript --tailwind --app --eslint
cd caregiver-webapp
```

#### 2. Install Dependencies
```bash
# Firebase
npm install firebase

# UI Components (shadcn/ui)
npx shadcn-ui@latest init

# State Management
npm install zustand

# Server State & Caching
npm install @tanstack/react-query

# Date Handling
npm install date-fns

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Icons
npm install lucide-react

# Phone Number Utilities
npm install libphonenumber-js

# HTTP Client
npm install axios
```

#### 3. Configure TypeScript
**File: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/store/*": ["./src/store/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 4. Environment Variables Setup
**File: `.env.local`**
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe (for later phases)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=xxx
TURNSTILE_SECRET_KEY=xxx

# Email Service (SendGrid or AWS SES)
SENDGRID_API_KEY=SGxxx
FROM_EMAIL=noreply@yourapp.com

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**File: `.env.example`** (commit this to git)
```bash
# Copy this file to .env.local and fill in your values

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
# ... (all variables without values)
```

#### 5. Project Structure
Create the following directory structure:
```bash
mkdir -p src/{app,components,lib,hooks,store,types,styles}
mkdir -p src/components/{ui,shared,auth,care,group,settings}
mkdir -p src/lib/{firebase,utils,notifications,voice,ai,payments}
```

#### 6. Install shadcn/ui Components
```bash
# Install commonly used components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add switch
```

---

## Task 1.2: TypeScript Type Definitions

### Objective
Create comprehensive type definitions for the entire application.

### File: `src/types/index.ts`
```typescript
import { Timestamp } from 'firebase/firestore';

// ============= User Types =============
export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  phoneNumberHash: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  groups: GroupMembership[];
  agencies: AgencyMembership[];
  preferences: UserPreferences;
  trialUsed: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    sms: boolean;
    email: boolean;
  };
}

// ============= Group Types =============
export interface Group {
  id: string;
  name: string;
  type: 'family' | 'agency';
  agencyId?: string;
  adminId: string;
  members: GroupMember[];
  elders: Elder[];
  subscription: Subscription;
  settings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  permissions: Permission[];
  addedAt: Date;
  addedBy: string;
}

export interface GroupMembership {
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface GroupSettings {
  notificationRecipients: string[];
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  enabled: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
  types: NotificationType[];
}

export type NotificationType = 'missed_doses' | 'diet_alerts' | 'supplement_alerts';

// ============= Agency Types =============
export interface Agency {
  id: string;
  name: string;
  adminId: string;
  subscription: Subscription;
  groups: string[];
  settings: AgencySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyMembership {
  agencyId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface AgencySettings {
  notificationPreferences: NotificationPreferences;
}

// ============= Elder Types =============
export interface Elder {
  id: string;
  name: string;
  dateOfBirth: Date;
  userId?: string;
  profileImage?: string;
  notes: string;
  createdAt: Date;
}

// ============= Medication Types =============
export interface Medication {
  id: string;
  groupId: string;
  elderId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  instructions?: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  reminders: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationFrequency {
  type: 'daily' | 'weekly' | 'asNeeded';
  times: string[];
  days?: number[];
}

export interface MedicationLog {
  id: string;
  groupId: string;
  elderId: string;
  medicationId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  loggedBy?: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  aiAnalysis?: AIAnalysis;
  createdAt: Date;
}

// ============= Supplement Types =============
export interface Supplement {
  id: string;
  groupId: string;
  elderId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplementLog {
  id: string;
  groupId: string;
  elderId: string;
  supplementId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  loggedBy?: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  createdAt: Date;
}

// ============= Diet Types =============
export interface DietEntry {
  id: string;
  groupId: string;
  elderId: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: string[];
  timestamp: Date;
  loggedBy: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  aiAnalysis?: DietAnalysis;
  createdAt: Date;
}

export interface DietAnalysis {
  nutritionScore: number;
  concerns: string[];
  recommendations: string[];
}

// ============= AI Types =============
export interface AIAnalysis {
  flag: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AISummary {
  id: string;
  groupId: string;
  elderId: string;
  date: Date;
  summary: DailySummary;
  generatedAt: Date;
}

export interface DailySummary {
  medicationCompliance: ComplianceData;
  supplementCompliance: ComplianceData;
  dietSummary: DietSummaryData;
  overallInsights: string[];
  missedDoses: MissedDose[];
}

export interface ComplianceData {
  taken: number;
  missed: number;
  percentage: number;
}

export interface DietSummaryData {
  mealsLogged: number;
  concernsDetected: string[];
  recommendations: string[];
}

export interface MissedDose {
  medicationName: string;
  scheduledTime: string;
  elderId: string;
}

// ============= Activity Log Types =============
export interface ActivityLog {
  id: string;
  groupId: string;
  elderId?: string;
  userId: string;
  action: string;
  entityType: 'medication' | 'supplement' | 'diet' | 'group' | 'user';
  entityId: string;
  details: Record<string, any>;
  timestamp: Date;
}

// ============= Subscription Types =============
export interface Subscription {
  tier: 'single' | 'family' | 'agency';
  status: 'trial' | 'active' | 'cancelled';
  trialEndsAt: Date;
  currentPeriodEnd: Date;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

// ============= Permission Types =============
export type Permission = 
  | 'view_all'
  | 'edit_medications'
  | 'edit_supplements'
  | 'edit_diet'
  | 'log_doses'
  | 'manage_members'
  | 'manage_settings'
  | 'view_insights';

// ============= Auth Types =============
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface OTPRequest {
  email: string;
  phoneNumber: string;
  turnstileToken: string;
}

export interface OTPVerification {
  email: string;
  phoneNumber: string;
  emailOTP: string;
  phoneOTP: string;
}

// ============= API Response Types =============
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## Task 1.3: Firebase Configuration

### Objective
Set up Firebase services for authentication, Firestore, and storage.

### File: `src/lib/firebase/config.ts`
```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
```

### File: `src/lib/firebase/auth.ts`
```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '@/types';
import { hashPhoneNumber } from '@/lib/utils/phoneUtils';

export class AuthService {
  /**
   * Create a new user account
   */
  static async createUser(
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    }
  ): Promise<User> {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Send email verification
    await sendEmailVerification(firebaseUser);

    // Create user document in Firestore
    const phoneHash = hashPhoneNumber(userData.phoneNumber);
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      phoneNumber: userData.phoneNumber,
      phoneNumberHash: phoneHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      groups: [],
      agencies: [],
      preferences: {
        theme: 'light',
        notifications: {
          sms: true,
          email: true
        }
      },
      trialUsed: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), user);

    return user;
  }

  /**
   * Sign in existing user
   */
  static async signIn(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Update last login
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const user = userDoc.data() as User;
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      { lastLoginAt: new Date() },
      { merge: true }
    );

    return user;
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  /**
   * Get current Firebase user
   */
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Get current user data from Firestore
   */
  static async getCurrentUserData(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
  }
}
```

### File: `src/lib/utils/phoneUtils.ts`
```typescript
import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';
import crypto from 'crypto';

/**
 * Validate US phone number
 */
export function isValidUSPhoneNumber(phone: string): boolean {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
    return phoneNumber.isValid() && phoneNumber.country === 'US';
  } catch {
    return false;
  }
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
  return phoneNumber.format('E.164');
}

/**
 * Hash phone number for trial tracking
 */
export function hashPhoneNumber(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  return crypto.createHash('sha256').update(formatted).digest('hex');
}

/**
 * Format phone number for display
 */
export function displayPhoneNumber(phone: string): string {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
    return phoneNumber.formatNational();
  } catch {
    return phone;
  }
}
```

---

## Task 1.4: Authentication UI & Flow

### Objective
Create login, signup, and OTP verification screens.

### File: `src/app/(auth)/layout.tsx`
```typescript
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
```

### File: `src/app/(auth)/login/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import Link from 'next/link';
import { isValidUSPhoneNumber } from '@/lib/utils/phoneUtils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email || !phoneNumber) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidUSPhoneNumber(phoneNumber)) {
      setError('Please enter a valid US phone number');
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the verification challenge');
      return;
    }

    setLoading(true);

    try {
      // Send OTP to email and phone
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber, turnstileToken })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      // Redirect to verification page
      router.push(`/verify?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phoneNumber)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and phone number to receive verification codes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (US only)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <TurnstileWidget onVerify={setTurnstileToken} />

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Verification Codes'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

### File: `src/components/auth/TurnstileWidget.tsx`
```typescript
'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
}

export function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Cloudflare Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (containerRef.current && window.turnstile) {
        window.turnstile.render(containerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
          callback: onVerify
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [onVerify]);

  return <div ref={containerRef} />;
}

// TypeScript declarations for Turnstile
declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: any) => void;
    };
  }
}
```

---

## Task 1.5: OTP Verification

### File: `src/app/(auth)/verify/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const phoneNumber = searchParams.get('phone');

  const [emailOTP, setEmailOTP] = useState('');
  const [phoneOTP, setPhoneOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email || !phoneNumber) {
      router.push('/login');
    }
  }, [email, phoneNumber, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOTP || !phoneOTP) {
      setError('Please enter both verification codes');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber, emailOTP, phoneOTP })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      // Redirect to dashboard or onboarding
      if (data.isNewUser) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCountdown(60);
    // Resend OTP logic here
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Identity</CardTitle>
        <CardDescription>
          Enter the verification codes sent to your email and phone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOTP">Email Verification Code</Label>
            <Input
              id="emailOTP"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={emailOTP}
              onChange={(e) => setEmailOTP(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Sent to {email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneOTP">SMS Verification Code</Label>
            <Input
              id="phoneOTP"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={phoneOTP}
              onChange={(e) => setPhoneOTP(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Sent to {phoneNumber}</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Resend codes in {countdown}s
              </p>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                className="text-sm"
              >
                Resend verification codes
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## Task 1.6: API Routes for Authentication

### File: `src/app/api/auth/send-otp/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendEmailOTP, sendSMSOTP } from '@/lib/notifications/otp';
import { isValidUSPhoneNumber } from '@/lib/utils/phoneUtils';

export async function POST(request: NextRequest) {
  try {
    const { email, phoneNumber, turnstileToken } = await request.json();

    // Validate Turnstile token
    const turnstileVerification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken
        })
      }
    );

    const turnstileResult = await turnstileVerification.json();

    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, error: 'Verification failed' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!email || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Email and phone number required' },
        { status: 400 }
      );
    }

    if (!isValidUSPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid US phone number' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTPs
    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTPs in session/database (use Redis or similar for production)
    // For now, we'll use a simple in-memory store (NOT for production)

    // Send OTPs
    await Promise.all([
      sendEmailOTP(email, emailOTP),
      sendSMSOTP(phoneNumber, phoneOTP)
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### File: `src/lib/notifications/otp.ts`
```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send OTP via email
 */
export async function sendEmailOTP(email: string, otp: string): Promise<void> {
  // Implement email sending logic (SendGrid, AWS SES, etc.)
  // For now, just log it
  console.log(`Email OTP for ${email}: ${otp}`);
  
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Your Verification Code',
  //   text: `Your verification code is: ${otp}`,
  //   html: `<p>Your verification code is: <strong>${otp}</strong></p>`
  // });
}

/**
 * Send OTP via SMS
 */
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<void> {
  await twilioClient.messages.create({
    body: `Your verification code is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
}
```

---

## Task 1.7: Basic Dashboard Layout

### File: `src/app/(dashboard)/layout.tsx`
```typescript
import { ReactNode } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### File: `src/components/shared/Sidebar.tsx`
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  Pill, 
  Apple, 
  Utensils, 
  FileText, 
  Settings,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/elders', label: 'Elders', icon: Users },
  { href: '/dashboard/medications', label: 'Medications', icon: Pill },
  { href: '/dashboard/supplements', label: 'Supplements', icon: Apple },
  { href: '/dashboard/diet', label: 'Diet', icon: Utensils },
  { href: '/dashboard/activity', label: 'Activity Log', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings }
];

const agencyNavItems = [
  { href: '/agency/dashboard', label: 'Agency Dashboard', icon: Building },
  { href: '/agency/groups', label: 'Groups', icon: Users },
  { href: '/agency/analytics', label: 'Analytics', icon: FileText }
];

export function Sidebar() {
  const pathname = usePathname();
  const isAgencyView = pathname?.startsWith('/agency');

  const items = isAgencyView ? agencyNavItems : navItems;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Caregiver
        </h1>
      </div>
      <nav className="px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### File: `src/components/shared/Header.tsx`
```typescript
'use client';

import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/firebase/auth';

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar>
                <AvatarImage src="/placeholder-avatar.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

---

## Task 1.8: Theme Provider & Dark Mode

### File: `src/app/providers.tsx`
```typescript
'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

### Update `src/app/layout.tsx`:
```typescript
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Caregiver App',
  description: 'Comprehensive caregiving management platform'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Phase 1 Checklist

- [ ] Project initialized with Next.js 14+ and TypeScript
- [ ] All dependencies installed
- [ ] Firebase configuration complete
- [ ] TypeScript types defined
- [ ] Authentication flow implemented (login, signup, OTP)
- [ ] Cloudflare Turnstile integrated
- [ ] API routes for auth created
- [ ] Basic dashboard layout with sidebar
- [ ] Theme system (light/dark mode) working
- [ ] Navigation structure in place
- [ ] Trial tracking logic implemented
- [ ] Environment variables configured
- [ ] Deployed to Vercel (staging)

---

## Testing Phase 1

### Manual Testing Checklist
1. **Authentication**
   - [ ] Can register new user
   - [ ] Receives email OTP
   - [ ] Receives SMS OTP
   - [ ] Can verify both OTPs
   - [ ] Redirects to dashboard after verification
   - [ ] Can log out and log back in

2. **UI/UX**
   - [ ] Dark mode toggle works
   - [ ] Sidebar navigation works
   - [ ] Responsive on mobile
   - [ ] No console errors

3. **Security**
   - [ ] Phone numbers are hashed
   - [ ] Protected routes require auth
   - [ ] Turnstile verification required

---

## Next Steps (Phase 2)

With Phase 1 complete, you're ready to move to Phase 2:
- Elder management (add/edit elders)
- Medication management (CRUD operations)
- Supplement management
- Diet tracking
- Manual logging functionality

---

**Phase 1 Duration**: 5-7 days  
**Estimated Lines of Code**: ~3,000 lines
