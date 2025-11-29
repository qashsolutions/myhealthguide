export default function PrivacyPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            <strong>Effective Date:</strong> November 28, 2025
            <br />
            <strong>Last Updated:</strong> November 28, 2025
          </p>

          {/* HIPAA Notice Callout */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 p-6 mb-8">
            <h3 className="font-semibold text-lg mb-2">HIPAA Notice of Privacy Practices</h3>
            <p className="text-sm mb-3">
              If you are using our Service for health-related purposes, please also review our HIPAA Notice of Privacy Practices, which explains how your Protected Health Information (PHI) is used and disclosed.
            </p>
            <a
              href="/hipaa-notice"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View HIPAA Notice of Privacy Practices →
            </a>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="mb-4">
              Qash Solutions Inc. ("we," "us," or "our") operates myguide.health (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p className="mb-4">
              <strong>Business Information:</strong>
              <br />
              Company: Qash Solutions Inc.
              <br />
              DUNS Number: 119536275
              <br />
              Location: Texas, United States
              <br />
              Contact: admin@myguide.health
              <br />
              Response Time: Within 5 business days
            </p>
            <p className="mb-4">
              By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Eligibility</h2>
            <p className="mb-4">
              Our Service is available only to users who are at least 18 years of age. By using the Service, you represent and warrant that you are at least 18 years old. We do not knowingly collect information from individuals under 18.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Geographic Scope</h2>
            <p className="mb-4">
              Our Service is intended for use by residents of the United States only. By using our Service, you consent to the transfer and processing of your information in the United States.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Information We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Personal Information</h3>
            <p className="mb-4">We collect the following personal information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Email address (for authentication and communication)</li>
              <li>Phone number (for SMS notifications and authentication)</li>
              <li>First and last name</li>
              <li>Profile image (optional)</li>
              <li>Email and phone verification status</li>
              <li>User preferences (theme, notification settings)</li>
              <li>Account creation and last login timestamps</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Elder and Care Information</h3>
            <p className="mb-4">If you use our caregiving features, we collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Elder name, date of birth, and profile image (optional)</li>
              <li>Care notes and group membership information</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Health and Medical Information</h3>
            <p className="mb-4">With your explicit consent, we collect and process sensitive health information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Medications:</strong> Names, dosage, frequency, prescribing doctor, start/end dates, reminders, supply tracking, medication logs (timing, status: taken/missed/skipped), voice transcripts, and AI analysis</li>
              <li><strong>Supplements:</strong> Names, dosage, frequency, logs with timing and status, voice transcripts</li>
              <li><strong>Diet Information:</strong> Meal types, food items, timestamps, voice transcripts, AI nutritional analysis</li>
              <li><strong>Medical Assessments:</strong> Dementia screening results, drug interaction data, medication side effects correlation, schedule conflict detection</li>
            </ul>
            <p className="mb-4">
              <strong>Important:</strong> You must provide explicit consent before accessing medical features. Your consent expires after 90 days and requires renewal. You may revoke consent at any time through your account settings.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4 Voice Data</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Voice recordings when you use voice-enabled medication or diet logging</li>
              <li>Voice transcripts with confidence scores</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.5 Location Data</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Optional geolocation data for caregiver check-in/check-out during shift sessions</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.6 Files and Documents</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Uploaded files (profile images, elder photos, documents)</li>
              <li>File metadata (path, name, type, size, category, upload timestamps)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.7 Usage and Activity Data</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Session information (session ID, device information, user agent, platform, language)</li>
              <li>Session duration, last activity timestamp, page views</li>
              <li>User actions (medication logs, diet entries, settings changes)</li>
              <li>All activity is logged with action type, timestamp, and details</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.8 Subscription and Trial Data</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Phone number hash (to enforce one trial per phone number)</li>
              <li>Trial start/end dates</li>
              <li>Subscription status and tier (Family, Single Agency, Multi Agency)</li>
              <li>Storage usage and limits</li>
              <li>Stripe customer ID and subscription ID (payment details handled by Stripe)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.9 Technical and Security Data</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>IP address (optional, collected only for medical consent audit trails)</li>
              <li>Browser and device information (user agent)</li>
              <li>Bot protection challenge responses</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To provide, maintain, and improve our Service</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To enable caregiving features (medication tracking, diet logging, health summaries)</li>
              <li>To send SMS and email notifications for medication reminders and health alerts</li>
              <li>To generate AI-powered health summaries and analysis</li>
              <li>To detect drug interactions and medication side effects using FDA data</li>
              <li>To enable voice-based logging features</li>
              <li>To process subscription payments and manage billing</li>
              <li>To enforce trial limits (one trial per phone number)</li>
              <li>To protect against bots and fraudulent activity</li>
              <li>To maintain audit trails for medical consent and data access (HIPAA-aligned practices)</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mb-4">
              <strong>We do not send marketing communications.</strong> All emails and SMS messages are transactional only (verification codes, medication reminders, health alerts).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Services</h2>
            <p className="mb-4">
              We use third-party service providers to support our Service. These providers have access to your information only to perform specific tasks on our behalf and are obligated to protect your data.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Infrastructure and Storage</h3>
            <p className="mb-4"><strong>Google Firebase/Google Cloud</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Firebase Authentication (email/password and phone number authentication)</li>
              <li>Cloud Firestore (database for all user and health data)</li>
              <li>Firebase Cloud Storage (file storage for images and documents)</li>
              <li>Firebase Cloud Messaging (push notifications)</li>
              <li>Firebase App Check with reCAPTCHA v3 (bot protection)</li>
              <li>Firebase Analytics (optional, only if you consent to analytics cookies)</li>
            </ul>
            <p className="mb-4">
              <strong>Data Shared:</strong> All user data, health records, files, authentication credentials, device tokens, and session data.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.2 Artificial Intelligence</h3>
            <p className="mb-4"><strong>Google Gemini AI</strong></p>
            <p className="mb-4">
              We use Google Gemini AI to generate daily health summaries, analyze diet entries, detect medication compliance patterns, and provide an AI chat assistant for caregivers.
            </p>
            <p className="mb-4">
              <strong>Data Sent to Gemini:</strong> Medication logs and schedules, supplement logs, diet entries, elder names and ages, health conditions (if provided), user chat messages, and voice transcripts.
            </p>
            <p className="mb-4">
              API Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.3 Communication Services</h3>
            <p className="mb-4"><strong>Twilio (SMS)</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: SMS verification codes (OTP), medication reminders, health alerts</li>
              <li>Data Shared: Phone numbers and SMS message content (medication names, alerts)</li>
            </ul>

            <p className="mb-4"><strong>SendGrid (Email)</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: Email verification and notifications</li>
              <li>Data Shared: Email addresses and notification content</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.4 Payment Processing</h3>
            <p className="mb-4"><strong>Stripe</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: Subscription payments and billing management</li>
              <li>Data Shared: Stripe customer ID and subscription ID. Payment information is handled directly by Stripe and never stored on our servers.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.5 Voice Services</h3>
            <p className="mb-4"><strong>Browser Web Speech API and Google Cloud Speech-to-Text</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: Voice-enabled medication and diet logging</li>
              <li>Data Shared: Audio recordings and voice transcripts</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.6 Medical Data</h3>
            <p className="mb-4"><strong>FDA API (OpenFDA)</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: Drug interaction detection, medication safety information, side effect data</li>
              <li>Data Shared: <strong>Medication names only</strong> (for lookup). No personal health information is sent to the FDA.</li>
              <li>API Endpoint: https://api.fda.gov/drug/label.json</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.7 Security Services</h3>
            <p className="mb-4"><strong>Cloudflare Turnstile and Google reCAPTCHA v3</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Purpose: Bot protection and CAPTCHA verification</li>
              <li>Data Shared: Challenge responses, browser metadata, user interactions, device information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Cookies and Tracking Technologies</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Essential Cookies (Always Active)</h3>
            <p className="mb-4">These cookies are necessary for the Service to function:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Authentication tokens (Firebase Auth session cookies)</li>
              <li>Session management (user session state)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.2 Optional Cookies (Require Your Consent)</h3>
            <p className="mb-4"><strong>Analytics Cookies:</strong> Track user behavior and usage patterns (Firebase Analytics)</p>
            <p className="mb-4"><strong>Marketing Cookies:</strong> Currently not used</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.3 Local Storage</h3>
            <p className="mb-4">We store the following data in your browser's local storage:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><code>app_session_id</code> - Session identifier (persists across page reloads until logout)</li>
              <li><code>app_session_data</code> - Session metadata</li>
              <li><code>app_session_start</code> - Session start timestamp</li>
              <li><code>cookie-consent</code> - Your cookie preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.4 Session Tracking</h3>
            <p className="mb-4">We collect session data including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Session ID, user ID (when logged in)</li>
              <li>Device information (user agent, platform, language)</li>
              <li>Session duration, last activity timestamp</li>
              <li>Page views and user actions</li>
            </ul>
            <p className="mb-4">Sessions expire after 24 hours of inactivity and are automatically deleted.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.5 Cookie Consent Management</h3>
            <p className="mb-4">
              When you first visit our Service, you will be asked to consent to optional cookies. Your consent preferences are stored in local storage and in our database with a timestamp and version number. You can change your preferences at any time through the cookie settings.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.6 Do Not Track</h3>
            <p className="mb-4">
              We respect Do Not Track (DNT) browser signals. If your browser sends a DNT signal, we automatically disable analytics cookies and do not track your browsing behavior beyond what is necessary for the Service to function.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Data Sharing</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.1 Within the Application</h3>
            <p className="mb-4"><strong>Group Members:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Family members in the same group can view shared elders' data</li>
              <li>Permission levels control who can view vs. edit</li>
              <li>Group admins have full access to group data</li>
            </ul>

            <p className="mb-4"><strong>Caregivers (Agency Model):</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Professional caregivers can only access elders they are specifically assigned to</li>
              <li>Agency super admins manage caregiver assignments and have access to all groups within their agency</li>
              <li>Strict isolation is enforced between different agencies</li>
            </ul>

            <p className="mb-4"><strong>Doctor Visit Summaries:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>You can share summaries with specific users</li>
              <li>Summaries can be exported as PDF or JSON for doctor appointments</li>
            </ul>

            <p className="mb-4"><strong>Shift Handoff Notes:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Shared between caregivers working with the same elder</li>
              <li>Includes medication administration, meals, and notable events</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.2 External Sharing</h3>
            <p className="mb-4">
              <strong>We do not automatically share your data with healthcare providers.</strong> You must manually export and share data with your doctors or hospitals. The Service provides export capabilities (JSON, CSV, PDF) for this purpose.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.3 Legal Requirements</h3>
            <p className="mb-4">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Security</h2>
            <p className="mb-4">We implement multiple layers of security to protect your information:</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.1 Infrastructure Security</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>All data stored in Firebase/Google Cloud with enterprise-grade security</li>
              <li>Data encrypted in transit (HTTPS/TLS) and at rest</li>
              <li>Firebase App Check validates all requests using reCAPTCHA v3</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.2 Access Control</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Authentication required for all operations (no anonymous access)</li>
              <li>Role-based permissions (admin, caregiver, family member)</li>
              <li>Ownership-based access control (users can only access their own data)</li>
              <li>Caregiver assignment validation (caregivers can only access assigned elders)</li>
              <li>Group membership validation</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.3 Data Protection Measures</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Phone numbers hashed before storage (for trial enforcement)</li>
              <li>Protected fields (users cannot modify: ID, creation date, trial dates, subscription status)</li>
              <li>Session expiry after 24 hours of inactivity</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.4 Medical Data Security</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Explicit consent required before accessing medical features</li>
              <li>Consent expires after 90 days (automatic re-consent required)</li>
              <li>All medical feature access is logged with audit trails</li>
              <li>IP address and user agent logged for medical consent audit trails (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.5 Security Limitations and Disclaimer</h3>
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600 p-4 mb-4">
              <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">Important Security Notice</p>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                While we implement commercially reasonable security measures to protect your health data and personal information, no method of transmission over the Internet or method of electronic storage is 100% secure.
              </p>
            </div>
            <p className="mb-4">
              <strong>You acknowledge and agree that:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We cannot guarantee the absolute security of your data</li>
              <li>You transmit information to us at your own risk</li>
              <li>We are not responsible for any circumvention of privacy settings or security measures contained on the Service</li>
              <li>Any unauthorized access, use, or disclosure of your information due to factors outside our reasonable control is not our responsibility</li>
              <li>You are responsible for maintaining the security of your account credentials and for any activities that occur under your account</li>
            </ul>
            <p className="mb-4">
              In the event of a security breach affecting your personal information, we will comply with applicable data breach notification laws and notify affected users as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Data Retention and Deletion</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.1 Active Accounts</h3>
            <p className="mb-4">We retain your data for as long as your account is active or as needed to provide you with the Service.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.2 Account Deletion</h3>
            <p className="mb-4">When you delete your account:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Free/Trial Accounts:</strong> Data is permanently deleted immediately upon account deletion</li>
              <li><strong>Paid Subscriptions:</strong> Your data and access remain available until the end of your current subscription period, after which all data is permanently deleted</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.3 What Gets Deleted</h3>
            <p className="mb-4">Complete data deletion includes:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>User profile and account information</li>
              <li>All groups (if you are the admin)</li>
              <li>All elders and their data</li>
              <li>All medications, supplements, and logs</li>
              <li>All diet entries</li>
              <li>All activity logs and session data</li>
              <li>All notification logs and reminder schedules</li>
              <li>All AI-generated summaries and chat history</li>
              <li>All invites and invite acceptances</li>
              <li>All uploaded files (profile images, documents) in Firebase Storage</li>
              <li>Phone number hash (trial enforcement data)</li>
              <li>Medical consents and access logs</li>
              <li>Cookie consent preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.4 Session Data</h3>
            <p className="mb-4">Sessions automatically expire and are deleted after 24 hours of inactivity.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.5 Backup Retention</h3>
            <p className="mb-4">We do not maintain backup retention periods. Data is permanently deleted as described above.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Your Rights</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.1 Access and Portability</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>View Your Data:</strong> Access all your information through your dashboard</li>
              <li><strong>Export Your Data:</strong> Download your complete data as JSON or CSV files at any time</li>
              <li>Export includes: user profile, groups, elders, medications, logs, diet entries, and activity logs</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.2 Deletion (Right to be Forgotten)</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Delete your account and all associated data at any time through account settings</li>
              <li>For paid accounts, data deletion occurs at the end of the current subscription period</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.3 Consent Management</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Medical Features:</strong> Provide, renew (every 90 days), or revoke consent for medical features</li>
              <li><strong>Cookies:</strong> Manage cookie preferences (analytics, marketing) at any time</li>
              <li><strong>Notifications:</strong> Control notification preferences through your settings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.4 Correction</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Update or correct your personal information through your account settings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.5 Opt-Out</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>SMS Notifications:</strong> Disable SMS alerts through notification settings</li>
              <li><strong>Email Notifications:</strong> Disable email alerts through notification settings</li>
              <li><strong>Analytics:</strong> Disable analytics cookies through cookie preferences or enable Do Not Track in your browser</li>
            </ul>

            <p className="mb-4">
              To exercise any of these rights, contact us at admin@myguide.health. We will respond within 5 business days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Data Breach Notification</h2>
            <p className="mb-4">
              In the event of a data breach that compromises your personal information, we will notify you within 72 hours of discovering the breach. Notification will be sent to your registered email address and may also be posted on our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Medical Disclaimer</h2>
            <p className="mb-4">
              <strong>Our Service is not a substitute for professional medical advice, diagnosis, or treatment.</strong> The AI-generated summaries, drug interaction detection, and other medical features are provided for informational purposes only and should not be relied upon as medical advice.
            </p>
            <p className="mb-4">
              Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or received through our Service.
            </p>
            <p className="mb-4">
              FDA drug interaction data is provided verbatim from the OpenFDA API and may not be complete or up-to-date. We are not responsible for any errors or omissions in FDA data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. When we make changes, we will update the "Last Updated" date at the top of this policy and post the updated policy on this page.
            </p>
            <p className="mb-4">
              We encourage you to review this Privacy Policy periodically for any changes. Your continued use of the Service after we post any modifications to the Privacy Policy constitutes your acknowledgment of the modifications and your consent to abide by the modified policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">15. Contact Us</h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <p className="mb-4">
              <strong>Email:</strong> admin@myguide.health
              <br />
              <strong>Company:</strong> Qash Solutions Inc.
              <br />
              <strong>DUNS Number:</strong> 119536275
              <br />
              <strong>Location:</strong> Texas, United States
            </p>
            <p className="mb-4">
              We will respond to all inquiries within 5 business days.
            </p>
          </section>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-12">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This Privacy Policy was last updated on November 28, 2025. By using myguide.health, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
