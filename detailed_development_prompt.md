# MyHealth Guide - Development Implementation Prompt

## Context Summary

I'm building **MyHealth Guide**, an eldercare-focused health platform that provides AI-powered medication conflict detection using Google's MedGemma model. This is a **2-day sprint** (June 21-22, 2025) to deploy an MVP with authentication and core AI features.

## Current Status ✅

### Infrastructure Ready
- **Vercel Account:** Configured with myguide.health domain
- **MedGemma API:** Google Vertex AI configured and tested in Vercel
- **Resend Email:** Configured with admin@myguide.health sender
- **Firebase:** Authentication and Firestore configured in Vercel
- **GitHub:** Repository ready at https://github.com/qashsolutions/myhealthguide
- **Environment Variables:** All API keys configured in Vercel

### Completed Design Work
- **User Requirements:** Complete functional and non-functional requirements
- **Wireframes:** Responsive design with eldercare accessibility focus
- **File Structure:** Next.js 14 App Router hierarchy with component breakdown
- **User Stories:** Detailed acceptance criteria for all features

## What I Need You to Build

### Day 1 Goals (June 21, 2025)
Build the **authentication foundation** with eldercare-optimized UI:

#### 1. Project Setup & Core Layout
```bash
# Initialize Next.js 14 project
npx create-next-app@latest myhealthguide --typescript --tailwind --app

# Required dependencies for eldercare platform
npm install firebase firebase-admin resend @google-cloud/aiplatform
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react # For professional SVG icons
```

#### 2. Authentication System Implementation
- **Authentication Gate Modal:** Blocks all features until user signs in
- **Single-Page Auth Toggle:** Signup/login on same page with toggle
- **Progressive Onboarding:** Optional phone number with "Skip for now" button
- **User-Friendly Messaging:** Clear instructions and helpful error messages
- **Firebase Integration:** Email/password authentication with 6-character minimum

#### 3. Responsive Layout System
- **Mobile-First Design:** Hamburger menu for mobile, full nav for desktop
- **Eldercare Typography:** Large fonts (1.2rem minimum) throughout
- **Professional SVG Icons:** Replace all emojis with accessible vectors
- **High Contrast Colors:** 4.5:1 ratio for text readability

### Day 2 Goals (June 22, 2025)
Implement **AI features** and email integration:

#### 1. MedGemma Integration
- **Medication Input Flow:** Step-by-step form with visual pill icons
- **AI Conflict Detection:** Connect to configured MedGemma API
- **Traffic Light Results:** Green ✅ / Yellow ⚠️ / Red 🚨 display system
- **Medical Disclaimers:** Clear messaging about consulting doctors

#### 2. Email System
- **Welcome Emails:** Automatic sending via Resend after signup
- **Password Reset:** Triggered after 3 failed login attempts
- **Professional Templates:** Branded emails from admin@myguide.health

#### 4. Medical Disclaimer & HIPAA/FDA Compliance
- **Dedicated Disclaimer Page:** Full-page HIPAA/FDA compliance before MedGemma access
- **Session-Based Acceptance:** User must read and accept terms before AI features
- **Legal Compliance:** Comprehensive medical disclaimers and liability protection
- **Eldercare-Friendly:** Large fonts and clear language for legal content

#### 5. Privacy & Unsubscribe Management
- **Footer Privacy Links:** Unsubscribe, Privacy Policy, Medical Disclaimer
- **Email Preference Management:** User control over communications
- **One-Click Unsubscribe:** Easy email opt-out functionality

## Key Differentiation Features

### 🎤 Voice Interface (Game-Changer for Eldercare)
**Why this matters:** Elderly users often struggle with typing, especially on mobile devices. Voice input removes this barrier completely.

#### Voice Capabilities to Implement:
```typescript
// Web Speech API integration
interface VoiceFeatures {
  speechRecognition: SpeechRecognition;     // Voice input
  speechSynthesis: SpeechSynthesis;         // Text-to-speech
  voiceCommands: string[];                  // Supported commands
}

// Example voice commands
const VOICE_COMMANDS = [
  "Add medication [name]",
  "Check my medications", 
  "Read the results",
  "What does this mean?",
  "Contact my doctor",
  "Start over"
];
```

#### Implementation Priority:
1. **Large microphone button** (150px diameter) with visual feedback
2. **Voice medication input** with fallback to text
3. **Text-to-speech results** reading AI responses aloud
4. **Voice commands** for hands-free navigation
5. **Audio confirmation** for critical actions

#### Technical Implementation:
```javascript
// Voice recognition for medication input
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';

// Text-to-speech for results
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 0.8; // Slower for elderly users
utterance.volume = 0.9;
speechSynthesis.speak(utterance);
```

### Eldercare Design Principles
- **Large Touch Targets:** Minimum 44px for all clickable elements
- **Generous Spacing:** Reduce cognitive load with white space
- **Clear Visual Hierarchy:** Bold headings, obvious primary actions
- **Simple Navigation:** One primary action per screen
- **Error Prevention:** Confirmation dialogs and clear undo options

### Responsive Breakpoints
```css
/* Mobile-first approach */
@media (min-width: 480px)  { /* Large phones */ }
@media (min-width: 768px)  { /* Tablets */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### Required API Endpoints
```typescript
// Authentication
POST /api/auth/signup          // User registration
POST /api/auth/login           // User authentication  
POST /api/auth/reset-password  // Password reset

// AI Features
POST /api/medication/check     // MedGemma conflict analysis
POST /api/health-qa           // MedGemma health questions

// Email
POST /api/email/welcome       // Welcome email via Resend
POST /api/email/reset         // Password reset email
```

### Environment Variables (Already Configured)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
FIREBASE_ADMIN_PRIVATE_KEY
RESEND_API_KEY
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_CREDENTIALS
NEXT_PUBLIC_APP_URL=https://myguide.health
```

## Component Architecture

### Priority Components (Day 1)
```typescript
// Layout Components
src/components/layout/Header.tsx        // Responsive with hamburger
src/components/layout/Footer.tsx        // Simple, professional
src/components/layout/MobileMenu.tsx    // Collapsible navigation

// Authentication Components
src/components/auth/AuthGate.tsx        // Modal blocking features
src/components/auth/AuthToggle.tsx      // Single-page signup/login
src/components/auth/SignupForm.tsx      // Progressive onboarding
src/components/auth/LoginForm.tsx       // Simple email/password

// UI Components
src/components/ui/Button.tsx            // Large, high-contrast
src/components/ui/Input.tsx             // Eldercare-optimized
src/components/ui/Modal.tsx             // Accessible modal
src/components/ui/Message.tsx           // Success/error messaging
```

### Priority Components (Day 2)
```typescript
// Medication Components
src/components/medication/MedicationForm.tsx    // Step-by-step input
src/components/medication/MedicationList.tsx    // Visual pills list
src/components/medication/ConflictResults.tsx   // Traffic light display

// Dashboard Components
src/components/dashboard/DashboardGrid.tsx      // 3-card layout
src/components/dashboard/FeatureCard.tsx        // Large, clickable cards
```

## AI Integration Specifications

### MedGemma Implementation
```typescript
// Expected AI request format
interface MedicationCheckRequest {
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  userAge?: number;
  conditions?: string[];
}

// Expected AI response format
interface ConflictResult {
  severity: 'safe' | 'minor' | 'major';
  title: string;
  description: string;
  interactions: Array<{
    medication1: string;
    medication2: string;
    risk: string;
    recommendation: string;
  }>;
}
```

### Traffic Light Display System
- **Green (Safe):** "✅ Safe Combination - No conflicts found"
- **Yellow (Minor):** "⚠️ Minor Interaction - Mention to your doctor"
- **Red (Major):** "🚨 Important: Contact Your Doctor - Serious interaction detected"

## User Flow Requirements

### Authentication Flow
```
1. User visits myguide.health
2. Clicks any feature → AuthGate modal appears
3. Chooses "Create Account" or "I Already Have Account"
4. Single-page form with toggle (signup ↔ login)
5. Progressive onboarding (email → password → name → phone[optional])
6. Success → Welcome email sent → Dashboard access
```

### Medication Check Flow
```
1. Authenticated user clicks "Check My Medications"
2. Step-by-step form: "Add your medications"
3. Each medication shows with pill icon
4. "Check for Conflicts" button → AI processing
5. Results display in traffic light format
6. Clear next steps and disclaimers
```

## Testing Requirements

### Accessibility Testing
- **Screen reader compatibility** with NVDA/JAWS
- **Keyboard navigation** for all interactions
- **Color contrast** validation (4.5:1 minimum)
- **Touch target size** validation (44px minimum)

### Responsive Testing
- **Mobile devices:** iPhone, Android phones
- **Tablets:** iPad, Android tablets  
- **Desktop:** Various screen sizes
- **Hamburger menu** functionality

### User Testing Scenarios
1. **Elderly user signup:** Can complete registration in under 2 minutes
2. **Medication checking:** Can add medications and understand results
3. **Mobile usage:** Can complete core tasks on smartphone
4. **Error recovery:** Can handle and understand error messages

## Success Criteria

### Day 1 Completion
- [ ] **Next.js project** deployed to Vercel
- [ ] **Authentication flow** working end-to-end
- [ ] **Responsive design** functioning on all devices
- [ ] **Professional UI** with large fonts and clear messaging
- [ ] **Error handling** with user-friendly messages

### Day 2 Completion
- [ ] **MedGemma integration** successfully detecting conflicts
- [ ] **Email system** sending welcome and reset emails
- [ ] **Health Q&A** feature working with AI responses
- [ ] **Traffic light results** displaying clearly
- [ ] **Medical disclaimers** present throughout

### Post-Sprint Validation
- [ ] **Elderly user testing** shows successful task completion
- [ ] **Performance** meets 3-second load time goal
- [ ] **Accessibility** passes WCAG 2.1 AA validation
- [ ] **Mobile experience** is smooth and intuitive

## Development Priorities

### Absolutely Critical (Must Have)
1. **Authentication gate** blocking all features
2. **Single-page auth toggle** with user-friendly messaging
3. **Responsive header** with hamburger menu
4. **MedGemma medication checking** with traffic light results
5. **Professional design** with eldercare accessibility

### Important (Should Have)
1. **Email integration** for welcome and reset
2. **Health Q&A** feature with AI responses
3. **Progressive onboarding** with optional phone number
4. **Comprehensive error handling** throughout

### Nice to Have (Could Have)
1. **Medication autocomplete** suggestions
2. **User account settings** page
3. **Advanced result explanations**
4. **Medication history** tracking

## Questions to Address During Development

1. **UI/UX:** Are the fonts large enough for elderly users in practice?
2. **Performance:** Is the AI response time acceptable (under 5 seconds)?
3. **Accessibility:** Does the interface work well with screen readers?
4. **Mobile:** Is the hamburger menu intuitive for elderly users?
5. **Trust:** Do the medical disclaimers build appropriate trust/caution?

## Ready to Start Development

All infrastructure is configured and ready. Focus on implementing the **Day 1 authentication foundation** first, then **Day 2 AI features**. The goal is a production-ready MVP that elderly users can successfully navigate to check their medication safety.

**Let's build this eldercare-focused health platform! 🏥**