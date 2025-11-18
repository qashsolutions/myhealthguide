export default function TermsPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            <strong>Effective Date:</strong> November 18, 2025
            <br />
            <strong>Last Updated:</strong> November 18, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you and Qash Solutions Inc. ("Company," "we," "us," or "our") governing your use of myguide.health (the "Service").
            </p>
            <p className="mb-4">
              <strong>Company Information:</strong>
              <br />
              Qash Solutions Inc.
              <br />
              DUNS Number: 119536275
              <br />
              Location: Texas, United States
              <br />
              Contact: admin@myguide.health
            </p>
            <p className="mb-4">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Eligibility</h2>
            <p className="mb-4">
              You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are at least 18 years of age.
            </p>
            <p className="mb-4">
              The Service is only available to residents of the United States. By using the Service, you represent that you are a US resident.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Registration</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Account Creation</h3>
            <p className="mb-4">To use the Service, you must create an account by providing:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your first and last name</li>
              <li>Email address OR phone number</li>
              <li>Verification of your email or phone number</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Trial Period</h3>
            <p className="mb-4">
              Each phone number is eligible for <strong>one 14-day free trial</strong>. We enforce this by storing a hash of your phone number. Attempting to create multiple trial accounts with the same phone number violates these Terms.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.3 Account Security</h3>
            <p className="mb-4">You are responsible for:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Subscription Plans and Billing</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Available Plans</h3>
            <p className="mb-4">We offer three subscription tiers:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Family Plan ($8.99/month):</strong> 1 admin + 1 member, 2 elders max, 25MB storage</li>
              <li><strong>Single Agency Plan ($14.99/month):</strong> 1 caregiver + 3 members, 4 elders max, 50MB storage</li>
              <li><strong>Multi Agency Plan ($144/month):</strong> 10 groups (each with 1 caregiver + 3 elders), 200MB storage</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Billing</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Subscriptions are billed monthly in advance</li>
              <li>Payment is processed through Stripe</li>
              <li>You authorize us to charge your payment method on file</li>
              <li>We do not store your payment card information</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Plan Limits</h3>
            <p className="mb-4">
              Plan limits are strictly enforced. If you exceed your plan's limits for elders, caregivers, groups, or storage, you must upgrade to a higher-tier plan. We reserve the right to restrict access to features if you exceed plan limits.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4 Cancellation and Refunds</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellations take effect at the end of the current billing period</li>
              <li>No refunds are provided for partial months</li>
              <li>Upon cancellation, you retain access until the end of your paid period</li>
              <li>After cancellation, your data is retained until the end of the paid period, then permanently deleted</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Acceptable Use</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">5.1 Permitted Use</h3>
            <p className="mb-4">You may use the Service to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Track medication schedules and logs</li>
              <li>Record diet and nutrition information</li>
              <li>Manage elder care activities</li>
              <li>Generate AI-powered health summaries and insights</li>
              <li>Collaborate with family members or caregivers</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Prohibited Activities</h3>
            <p className="mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Create multiple trial accounts using the same phone number</li>
              <li>Share your account credentials with unauthorized users</li>
              <li>Use the Service for any commercial purpose not authorized by us</li>
              <li>Attempt to bypass plan limits or security measures</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Scrape, data mine, or extract data from the Service</li>
              <li>Reverse engineer or attempt to access source code</li>
              <li>Impersonate another person or entity</li>
              <li>Upload false, misleading, or fraudulent information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Medical Disclaimer</h2>
            <p className="mb-4">
              <strong className="text-red-600 dark:text-red-400">IMPORTANT: The Service is NOT a medical device and is NOT intended to diagnose, treat, cure, or prevent any disease.</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>AI-generated summaries and insights are for informational purposes only</li>
              <li>Drug interaction detection uses FDA data but may not be complete or current</li>
              <li>Always consult a qualified healthcare provider before making medical decisions</li>
              <li>Never disregard professional medical advice based on information from our Service</li>
              <li>In case of emergency, call 911 immediately</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Medical Consent</h3>
            <p className="mb-4">
              Before accessing medical features (drug interactions, side effects, dementia screening), you must provide explicit consent. Your consent expires after 90 days and must be renewed. You may revoke consent at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Intellectual Property</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Our Rights</h3>
            <p className="mb-4">
              The Service, including all content, features, and functionality, is owned by Qash Solutions Inc. and protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.2 Your Content</h3>
            <p className="mb-4">
              You retain ownership of all data you upload to the Service (medications, diet entries, notes, files). By uploading content, you grant us a limited license to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Store and process your content to provide the Service</li>
              <li>Generate AI summaries and insights based on your data</li>
              <li>Share your data with third-party services as described in our Privacy Policy</li>
            </ul>
            <p className="mb-4">
              This license terminates when you delete your content or account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Data and Privacy</h2>
            <p className="mb-4">
              Your use of the Service is also governed by our <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>, which describes how we collect, use, and protect your information.
            </p>
            <p className="mb-4">Key points:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We store your data in Firebase/Google Cloud</li>
              <li>We use Google Gemini AI to generate health summaries</li>
              <li>We share medication names with the FDA API for drug interaction detection</li>
              <li>You can export all your data at any time</li>
              <li>You can permanently delete your account and all data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Termination</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">9.1 By You</h3>
            <p className="mb-4">
              You may terminate your account at any time through account settings. Upon termination:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Trial accounts:</strong> Data is permanently deleted immediately</li>
              <li><strong>Paid accounts:</strong> Access continues until the end of the billing period, then data is permanently deleted</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.2 By Us</h3>
            <p className="mb-4">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violate these Terms</li>
              <li>Fail to pay subscription fees</li>
              <li>Engage in fraudulent activity</li>
              <li>Use the Service in a manner that harms us or other users</li>
            </ul>
            <p className="mb-4">
              We will provide notice before termination unless immediate termination is required for legal or security reasons.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Disclaimers and Limitation of Liability</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">10.1 Service "As Is"</h3>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.2 Limitation of Liability</h3>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, QASH SOLUTIONS INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="mb-4">
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">10.3 Third-Party Services</h3>
            <p className="mb-4">
              We are not responsible for the accuracy, reliability, or availability of third-party services (Firebase, Google Gemini AI, FDA API, Twilio, SendGrid, Stripe) integrated with our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify and hold harmless Qash Solutions Inc. and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Any content you upload to the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Dispute Resolution</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">12.1 Informal Resolution</h3>
            <p className="mb-4">
              Before filing a claim, you agree to contact us at admin@myguide.health and attempt to resolve the dispute informally for at least 30 days.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.2 Arbitration</h3>
            <p className="mb-4">
              Any dispute arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules, conducted in Texas, United States.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.3 Class Action Waiver</h3>
            <p className="mb-4">
              You agree to resolve disputes on an individual basis and waive the right to participate in class actions or class arbitrations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Governing Law</h2>
            <p className="mb-4">
              These Terms are governed by the laws of the State of Texas and the United States, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Changes to Terms</h2>
            <p className="mb-4">
              We may update these Terms from time to time. When we make changes, we will update the "Last Updated" date and post the revised Terms on this page.
            </p>
            <p className="mb-4">
              Your continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">15. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">16. Contact Us</h2>
            <p className="mb-4">
              If you have questions about these Terms, please contact us:
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
              By using myguide.health, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
