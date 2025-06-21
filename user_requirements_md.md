# User Requirements Document - MyHealth Guide
**Version:** 1.0  
**Date:** June 20, 2025  
**Sprint Duration:** 2 Days (June 21-22, 2025)  
**Platform:** Next.js 14 Web Application  

---

## Executive Summary

MyHealth Guide is an eldercare-focused health platform providing AI-powered medication conflict detection using Google's MedGemma model. The platform prioritizes accessibility, user-friendly messaging, and professional design for elderly users.

---

## Project Context

### Current Status
- **Existing Infrastructure:** MedGemma, Resend, and Firebase configured in Vercel
- **Domain:** myguide.health (active)
- **Repository:** https://github.com/qashsolutions/myhealthguide
- **Target Users:** Elderly patients managing multiple medications
- **Primary Goal:** Deploy MVP with authentication and AI medication checking

### Business Objectives
1. **Immediate Value:** Provide medication conflict detection for elderly users
2. **Future Growth:** Foundation for mobile app and additional health features
3. **AI-First Approach:** Showcase MedGemma capabilities in healthcare
4. **User Safety:** Clear, actionable health guidance with medical disclaimers

---

## User Personas

### Primary Persona: Eleanor (Age 72)
- **Tech Comfort:** Basic smartphone/tablet use
- **Health Status:** Takes 4-6 daily medications
- **Pain Points:** Confused by small text, complex interfaces
- **Goals:** Ensure medication safety, understand drug interactions
- **Preferences:** Large fonts, simple navigation, clear instructions

### Secondary Persona: Robert (Age 68)
- **Tech Comfort:** Moderate computer use
- **Health Status:** Recently prescribed new medications
- **Pain Points:** Overwhelmed by medical information
- **Goals:** Get quick, trustworthy health answers
- **Preferences:** Professional appearance, authoritative sources

---

## Functional Requirements

### FR1: Authentication System
**Priority:** High | **Sprint:** Day 1

#### Requirements
- **Single-page auth toggle** (signup/login on same page)
- **Progressive onboarding** with optional phone number
- **Email/password authentication** via Firebase
- **Password requirements:** Minimum 6 characters with clear messaging
- **Form validation** with user-friendly error messages

#### User Stories
- **US1.1:** As a new user, I want to create an account with my name, email, and password in under 2 minutes
- **US1.2:** As a returning user, I want to log in quickly with email and password
- **US1.3:** As a forgetful user, I want clear password requirements and helpful error messages
- **US1.4:** As a cautious user, I want to skip phone number entry and add it later

#### Acceptance Criteria
- [ ] Single form toggles between signup and login modes
- [ ] Password field shows "Must be at least 6 characters" helper text
- [ ] Phone number field has "Skip for now" button
- [ ] Success messages appear after successful actions
- [ ] Error messages are clear and actionable

### FR2: Authentication Gate
**Priority:** High | **Sprint:** Day 1

#### Requirements
- **Modal-based authentication gate** for all protected features
- **Professional messaging** explaining need for account
- **Clear call-to-action buttons** for signup/login
- **Responsive design** across all devices

#### User Stories
- **US2.1:** As an anonymous user, I want to understand why I need an account before accessing features
- **US2.2:** As a security-conscious user, I want assurance that my health data is protected

#### Acceptance Criteria
- [ ] Clicking any feature button triggers auth gate modal
- [ ] Modal explains benefits of creating account
- [ ] "Create Account" and "I Already Have an Account" buttons work
- [ ] Modal is accessible and responsive

### FR3: Medication Conflict Detection
**Priority:** High | **Sprint:** Day 2

#### Requirements
- **Step-by-step medication input** with visual pills icons
- **MedGemma AI integration** for conflict analysis
- **Traffic light results system** (Green/Yellow/Red)
- **Clear, non-medical language** in results
- **Professional disclaimers** about consulting doctors

#### User Stories
- **US3.1:** As an elderly user, I want to easily add my medications with visual guidance
- **US3.2:** As a multi-medication user, I want AI-powered safety checking for drug interactions
- **US3.3:** As a cautious user, I want clear, color-coded results I can understand
- **US3.4:** As a responsible user, I want disclaimers reminding me to consult my doctor

#### Acceptance Criteria
- [ ] Medication form has autocomplete/search functionality
- [ ] Each medication shows with pill icon and description
- [ ] "Add Another Medication" button works intuitively
- [ ] AI analysis completes within 5 seconds
- [ ] Results show in traffic light format (✅⚠️🚨)
- [ ] Each result includes clear next steps
- [ ] "Contact Your Doctor" buttons are prominent for warnings

### FR4: Health Q&A Feature
**Priority:** Medium | **Sprint:** Day 2

#### Requirements
- **Text input for health questions** with character limits
- **MedGemma AI responses** in plain language
- **Medical disclaimers** on all responses
- **Response time under 10 seconds**

#### User Stories
- **US4.1:** As a curious user, I want to ask general health questions and get AI responses
- **US4.2:** As a safety-conscious user, I want clear disclaimers that AI advice isn't medical advice

#### Acceptance Criteria
- [ ] Question input form with helpful placeholder text
- [ ] AI responses in simple, clear language
- [ ] Disclaimers appear with every response
- [ ] Loading states during AI processing

### FR6: Medical Disclaimer & Compliance
**Priority:** High | **Sprint:** Day 2

#### Requirements
- **Dedicated disclaimer page** before accessing MedGemma features
- **Clear HIPAA/FDA compliance messaging** with legal disclaimers
- **Mandatory acceptance** with "Understand and Accept" button
- **Session-based tracking** to avoid repeated prompts
- **Professional legal language** while remaining eldercare-friendly

#### User Stories
- **US6.1:** As a user, I want clear information about AI limitations before using health features
- **US6.2:** As a cautious user, I want to understand that this is not medical advice
- **US6.3:** As a legally-aware user, I want transparency about data usage and accuracy limitations
- **US6.4:** As a returning user, I don't want to see this disclaimer every time (session-based)

#### Acceptance Criteria
- [ ] Disclaimer page appears before first MedGemma feature access
- [ ] Page includes comprehensive HIPAA/FDA compliance text
- [ ] "Understand and Accept" button is prominent and accessible
- [ ] User cannot proceed without explicit acceptance
- [ ] Acceptance is remembered for the session
- [ ] Page is accessible and readable for elderly users

### FR8: Voice Interface & Accessibility
**Priority:** High | **Sprint:** Day 2 (Differentiator Feature)

#### Requirements
- **Voice input for medication names** using Web Speech API
- **Text-to-speech for AI responses** using device speakers
- **Hands-free operation** with voice commands
- **Large microphone button** with clear visual feedback
- **Fallback to text input** if voice not supported
- **Voice confirmation** for critical actions

#### User Stories
- **US8.1:** As an elderly user with typing difficulties, I want to speak my medications instead of typing
- **US8.2:** As a user with vision issues, I want AI responses read aloud to me
- **US8.3:** As a hands-free user, I want to operate the medication checker with voice commands
- **US8.4:** As a cautious user, I want voice confirmation before submitting medication checks

#### Acceptance Criteria
- [ ] Large microphone button appears on medication input forms
- [ ] Voice recognition accurately captures medication names
- [ ] AI responses are automatically read aloud with device speakers
- [ ] Voice commands work for "Add medication", "Check conflicts", "Read results"
- [ ] Visual feedback shows when microphone is listening
- [ ] Fallback to text input if voice recognition fails
- [ ] Voice works across major browsers (Chrome, Safari, Firefox)

### FR9: Smart Voice Commands
**Priority:** Medium | **Sprint:** Future Enhancement

#### Voice Command Examples
- **"Add medication [name]"** - Adds medication to list
- **"Check my medications"** - Triggers AI analysis
- **"Read the results"** - Reads AI response aloud
- **"What does this mean?"** - Explains medical terms
- **"Contact my doctor"** - Shows doctor contact options
- **"Start over"** - Clears medication list
**Priority:** Medium | **Sprint:** Day 2

#### Requirements
- **Footer unsubscribe link** on all pages
- **Privacy policy integration** with clear access
- **Email preference management** page
- **One-click unsubscribe** from all communications
- **GDPR/CCPA compliance** messaging

#### User Stories
- **US7.1:** As a user, I want easy access to unsubscribe from emails
- **US7.2:** As a privacy-conscious user, I want control over my communication preferences
- **US7.3:** As a user, I want to easily access the privacy policy

#### Acceptance Criteria
- [ ] Footer includes "Unsubscribe" and "Privacy Policy" links
- [ ] Unsubscribe page allows email preference management
- [ ] One-click unsubscribe works from email links
- [ ] Privacy policy is easily accessible from all pages
**Priority:** Medium | **Sprint:** Day 2

#### Requirements
- **Welcome emails** for new users via Resend API
- **Password reset emails** after failed login attempts
- **Sender address:** admin@myguide.health
- **Professional email templates** matching brand

#### User Stories
- **US5.1:** As a new user, I want a welcome email confirming my account creation
- **US5.2:** As a user with login issues, I want password reset emails after 3 failed attempts

#### Acceptance Criteria
- [ ] Welcome emails sent immediately after signup
- [ ] Password reset triggered after 3 failed login attempts
- [ ] Emails have professional templates and clear CTAs
- [ ] All emails sent from admin@myguide.health

---

## Non-Functional Requirements

### NFR1: Accessibility (WCAG 2.1 AA)
- **Minimum font size:** 1.2rem (19.2px) for all text
- **Color contrast:** 4.5:1 ratio minimum for text
- **Touch targets:** Minimum 44px for all clickable elements
- **Keyboard navigation:** Full functionality without mouse
- **Screen reader compatibility** for all interactive elements

### NFR2: Performance
- **Page load time:** Under 3 seconds on 3G connection
- **AI response time:** Under 5 seconds for medication checking
- **Mobile performance:** 90+ Lighthouse score
- **Bundle size:** Optimized for slow connections

### NFR3: Security
- **Firebase Authentication:** Secure user sessions
- **Environment variables:** All API keys secured in Vercel
- **HTTPS enforcement:** All connections encrypted
- **Input validation:** Server-side validation for all forms
- **Medical data handling:** No storage of sensitive health information

### NFR4: Responsive Design
- **Mobile-first approach** with progressive enhancement
- **Breakpoints:** 480px (phone), 768px (tablet), 1024px (desktop)
- **Hamburger navigation** on mobile devices
- **Touch-friendly interface** for elderly users
- **Consistent experience** across all devices

---

## User Interface Requirements

### UI1: Design System
- **Color Palette:** 
  - Primary: #3182ce (blue)
  - Success: #38a169 (green)
  - Warning: #ed8936 (orange)
  - Danger: #e53e3e (red)
- **Typography:** Large, readable fonts with clear hierarchy
- **Icons:** Professional SVG icons throughout
- **Spacing:** Generous white space for elderly-friendly design

### UI2: Component Library
- **Authentication components:** AuthGate, AuthToggle, SignupForm, LoginForm
- **Medication components:** MedicationForm, MedicationList, ConflictResults
- **UI components:** Button, Input, Modal, Card, Message
- **Layout components:** Header, Footer, Navigation

### UI3: Responsive Behavior
- **Desktop (1024px+):** Full horizontal navigation, multi-column layouts
- **Tablet (768px-1024px):** Condensed navigation, balanced sizing
- **Mobile (0-768px):** Hamburger menu, single-column layout, larger touch targets

---

## Technical Requirements

### TR1: Technology Stack
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS with custom eldercare configurations
- **Authentication:** Firebase Auth
- **Database:** Firebase Firestore (for user data)
- **AI Integration:** Google Vertex AI (MedGemma)
- **Email Service:** Resend API
- **Deployment:** Vercel (existing setup)

### TR2: API Endpoints
```
POST /api/auth/signup          # User registration
POST /api/auth/login           # User authentication
POST /api/auth/reset-password  # Password reset
POST /api/medication/check     # MedGemma medication analysis
POST /api/health-qa           # MedGemma health questions
POST /api/email/welcome       # Welcome email sending
POST /api/email/reset         # Password reset email
```

### TR3: Environment Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
FIREBASE_ADMIN_PRIVATE_KEY
RESEND_API_KEY
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_CREDENTIALS
NEXT_PUBLIC_APP_URL=https://myguide.health
```

---

## Success Criteria

### Immediate Success (End of Sprint)
- [ ] **Authentication flow** works without errors across all devices
- [ ] **MedGemma integration** successfully detects medication conflicts
- [ ] **Email notifications** are delivered reliably
- [ ] **Responsive design** functions on mobile, tablet, and desktop
- [ ] **Accessibility standards** met for elderly users
- [ ] **User testing** shows elderly users can complete core tasks

### Post-Launch Success (Week 1)
- [ ] **Zero critical bugs** reported
- [ ] **Email delivery rate** >95%
- [ ] **AI response time** consistently under 5 seconds
- [ ] **User feedback** indicates ease of use for target demographic
- [ ] **Performance metrics** meet NFR requirements

---

## Risk Assessment

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| MedGemma API reliability | Medium | High | Implement fallback messaging and error handling |
| Email delivery issues | Low | Medium | Test thoroughly with multiple email providers |
| Mobile performance | Medium | High | Optimize bundle size and implement lazy loading |
| Firebase quota limits | Low | Medium | Monitor usage and implement rate limiting |

### User Experience Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| Elderly users struggle with interface | Medium | High | Conduct user testing and iterative improvements |
| Medication input complexity | Medium | Medium | Implement autocomplete and visual guides |
| Trust in AI recommendations | High | High | Clear disclaimers and professional design |
| Mobile accessibility issues | Low | High | Thorough testing with accessibility tools |

---

## Acceptance Testing Scenarios

### Scenario 1: New User Registration
1. **Given:** User visits myguide.health for first time
2. **When:** User clicks "Check My Medications"
3. **Then:** Authentication gate modal appears
4. **When:** User clicks "Create Account"
5. **Then:** Single-page auth form loads with signup mode
6. **When:** User fills required fields and submits
7. **Then:** Account created, welcome email sent, user logged in

### Scenario 2: Medication Conflict Check
1. **Given:** Authenticated user on dashboard
2. **When:** User clicks "Check My Medications"
3. **Then:** Medication input form loads
4. **When:** User adds medications and clicks "Check for Conflicts"
5. **Then:** AI analysis completes within 5 seconds
6. **When:** Results display
7. **Then:** Traffic light system shows clear, actionable results

### Scenario 3: Mobile Responsiveness
1. **Given:** User on mobile device (iPhone/Android)
2. **When:** User visits any page
3. **Then:** Hamburger menu appears, layout is single-column
4. **When:** User taps hamburger menu
5. **Then:** Navigation slides down with large touch targets
6. **When:** User completes any task
7. **Then:** All interactions work smoothly with large fonts

---

## Definition of Done

A feature is considered complete when:
- [ ] **Functionality** works as specified in requirements
- [ ] **Responsive design** tested on mobile, tablet, desktop
- [ ] **Accessibility** validated with screen reader and keyboard navigation
- [ ] **Error handling** implemented for all failure scenarios
- [ ] **User messaging** is friendly and helpful
- [ ] **Performance** meets specified benchmarks
- [ ] **Security** validated for authentication and data handling
- [ ] **Code quality** meets team standards
- [ ] **Documentation** updated for maintenance

---

## Appendix

### A1: Wireframe Reference
[Link to detailed wireframes showing responsive behavior and component interactions]

### A2: Brand Guidelines
- **Logo:** "MyHealth Guide" text-only
- **Tone:** Professional, trustworthy, elderly-friendly
- **Messaging:** Clear, non-medical language with safety disclaimers

### A3: Medical Disclaimers
Standard disclaimer text to appear with all AI-generated health content:
*"This information is for educational purposes only and is not intended as medical advice. Always consult with your healthcare provider before making changes to your medications or treatment plan."*