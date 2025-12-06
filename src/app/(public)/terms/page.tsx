export default function TermsPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            <strong>Effective Date:</strong> November 28, 2025
            <br />
            <strong>Last Updated:</strong> November 28, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Qash Solutions Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your use of myguide.health (the &quot;Service&quot;).
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
              Each phone number is eligible for <strong>one 45-day free trial</strong>. We enforce this by storing a hash of your phone number. Attempting to create multiple trial accounts with the same phone number violates these Terms.
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
              <li><strong>Multi Agency Plan ($144/month):</strong> 10 groups (each with 1 caregiver + 3 elders), 500MB storage</li>
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
              Plan limits are strictly enforced. If you exceed your plan&apos;s limits for elders, caregivers, groups, or storage, you must upgrade to a higher-tier plan. We reserve the right to restrict access to features if you exceed plan limits.
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
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Medical Disclaimer - NOT MEDICAL ADVICE</h2>

            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-6 mb-6">
              <p className="font-bold text-red-800 dark:text-red-300 mb-3">
                IMPORTANT: PLEASE READ THIS SECTION CAREFULLY
              </p>
              <p className="text-red-700 dark:text-red-400">
                The Services, including any AI-generated insights, analysis, summaries, drug interaction detection, or other content, are for <strong>informational and educational purposes only</strong> and do not constitute medical advice, medical diagnosis, or medical treatment.
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.1 No Doctor-Patient Relationship</h3>
            <p className="mb-4">
              The Services are not intended to be a substitute for professional medical advice, diagnosis, or treatment. <strong>No doctor-patient relationship is created between you and Qash Solutions Inc. by your use of the Services.</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition</li>
              <li>Never disregard professional medical advice or delay in seeking it because of something you have read or accessed through the Services</li>
              <li>If you think you may have a medical emergency, call your doctor or 911 immediately</li>
              <li>Qash Solutions Inc. does not recommend or endorse any specific tests, physicians, products, procedures, opinions, or other information that may be mentioned through the Services</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.2 Limitations of Service</h3>
            <p className="mb-4">The Service is NOT a medical device and is NOT intended to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Diagnose, treat, cure, or prevent any disease or medical condition</li>
              <li>Replace the advice, diagnosis, or treatment provided by a licensed healthcare professional</li>
              <li>Provide emergency medical services or crisis intervention</li>
              <li>Serve as a primary source of medical information for clinical decision-making</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.3 Drug Interaction and FDA Data</h3>
            <p className="mb-4">
              Drug interaction detection uses data from the FDA OpenFDA API. This data may not be complete, current, or accurate. The absence of a warning does not mean a drug interaction does not exist. <strong>Always consult a pharmacist or physician before combining medications.</strong>
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.4 Medical Feature Consent</h3>
            <p className="mb-4">
              Before accessing medical features (drug interactions, side effects, dementia screening), you must provide explicit consent acknowledging these limitations. Your consent expires after 90 days and must be renewed. You may revoke consent at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Artificial Intelligence (AI) Technology Disclaimer</h2>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600 p-6 mb-6">
              <p className="font-bold text-amber-800 dark:text-amber-300 mb-3">
                AI OUTPUT ACCURACY DISCLAIMER
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                You acknowledge that the Services utilize artificial intelligence and machine learning technologies ("AI Technologies"). AI Technologies are probabilistic in nature and may generate output that is inaccurate, incomplete, misleading, or inappropriate.
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Nature of AI Technology</h3>
            <p className="mb-4">You understand and acknowledge that:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>AI Technologies use statistical models to generate responses and may produce errors, inaccuracies, or "hallucinations" (confident statements that are factually incorrect)</li>
              <li>AI-generated content may be incomplete, out of date, or inconsistent with current medical knowledge or best practices</li>
              <li>The AI may misinterpret, misclassify, or incorrectly analyze the information you provide</li>
              <li>AI outputs should be considered as one of many inputs to your decision-making, not as authoritative or definitive answers</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.2 User Responsibility for AI Output</h3>
            <p className="mb-4">
              <strong>You are solely responsible for verifying the accuracy, completeness, and appropriateness of any output generated by the Services before applying it to any medical, health, or professional use.</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>You agree that you will not rely solely on AI-generated content for any critical decision-making, including clinical decision-making, medication management, or health-related decisions</li>
              <li>You agree to independently verify all AI-generated summaries, recommendations, and analyses with qualified healthcare professionals</li>
              <li>You understand that Qash Solutions Inc. makes no representations or warranties regarding the accuracy of AI-generated content</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">7.3 AI Features Covered</h3>
            <p className="mb-4">This disclaimer applies to all AI-powered features in the Service, including but not limited to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Daily health summaries and insights</li>
              <li>Medication compliance analysis</li>
              <li>Diet and nutrition analysis</li>
              <li>AI chat assistant responses</li>
              <li>Voice transcription and interpretation</li>
              <li>Pattern detection and trend analysis</li>
              <li>Any other feature that uses Google Gemini AI or similar AI models</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Healthcare Professional Users</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.1 Professional Judgment Required</h3>
            <p className="mb-4">
              If you are a licensed healthcare professional (including but not limited to physicians, nurses, pharmacists, caregivers, or other medical practitioners), the following additional terms apply:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>The Services are intended to assist healthcare professionals but do not replace the exercise of professional judgment</li>
              <li>You are solely responsible for all decisions made regarding patient care</li>
              <li>You agree to review all AI-generated outputs with independent professional judgment and current standards of care before utilizing such outputs in any patient setting</li>
              <li>You must verify all information against authoritative medical sources and your professional training</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.2 Human-in-the-Loop Requirement</h3>
            <p className="mb-4">
              <strong>You agree that a qualified human professional must review and approve any AI-generated content before it is used in connection with patient care or clinical decision-making.</strong> The Service is designed as a support tool, not an autonomous decision-making system.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.3 Professional Liability</h3>
            <p className="mb-4">
              Healthcare professionals using the Service remain subject to all applicable professional standards, licensing requirements, and legal obligations. Use of the Service does not transfer any professional liability from the healthcare professional to Qash Solutions Inc.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Intellectual Property</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">9.1 Our Rights</h3>
            <p className="mb-4">
              The Service, including all content, features, and functionality, is owned by Qash Solutions Inc. and protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.2 Your Content</h3>
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
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Data and Privacy</h2>
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
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Termination</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">11.1 By You</h3>
            <p className="mb-4">
              You may terminate your account at any time through account settings. Upon termination:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Trial accounts:</strong> Data is permanently deleted immediately</li>
              <li><strong>Paid accounts:</strong> Access continues until the end of the billing period, then data is permanently deleted</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">11.2 By Us</h3>
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
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Disclaimers and Limitation of Liability</h2>

            <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-600 p-6 mb-6">
              <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">
                PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS OUR LIABILITY TO YOU
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.1 Service "As Is"</h3>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.2 Limitation of Liability</h3>
            <p className="mb-4">
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL QASH SOLUTIONS INC., ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Loss of data, use, goodwill, or other intangible losses</li>
              <li>Personal injury or property damage resulting from your access to or use of the Service</li>
              <li>Any unauthorized access to or use of our servers or any personal information stored therein</li>
              <li>Any interruption or cessation of transmission to or from the Service</li>
              <li>Any bugs, viruses, or other harmful code that may be transmitted through the Service</li>
              <li>Any errors or omissions in any content or for any loss or damage incurred as a result of the use of any content posted, emailed, transmitted, or otherwise made available through the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.3 Liability Cap</h3>
            <p className="mb-4">
              <strong>IN NO EVENT SHALL QASH SOLUTIONS INC.'S AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE EXCEED THE GREATER OF:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>ONE HUNDRED U.S. DOLLARS (US $100.00); OR</li>
              <li>THE TOTAL AMOUNTS PAID BY YOU TO QASH SOLUTIONS INC. FOR THE SERVICE DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE DATE THE CLAIM AROSE</li>
            </ul>
            <p className="mb-4">
              THE LIMITATIONS OF THIS SECTION SHALL APPLY TO ANY THEORY OF LIABILITY, WHETHER BASED ON WARRANTY, CONTRACT, STATUTE, TORT (INCLUDING NEGLIGENCE), OR OTHERWISE, AND WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.4 Third-Party Services</h3>
            <p className="mb-4">
              We are not responsible for the accuracy, reliability, availability, or performance of third-party services (including but not limited to Firebase, Google Cloud, Google Gemini AI, FDA OpenFDA API, Twilio, SendGrid, Stripe) integrated with our Service. Your use of such third-party services is at your own risk and subject to the terms and conditions of those third parties.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">12.5 Jurisdictional Limitations</h3>
            <p className="mb-4">
              Some jurisdictions do not allow the exclusion of certain warranties or the limitation or exclusion of liability for incidental or consequential damages. Accordingly, some of the above limitations may not apply to you. In such jurisdictions, our liability shall be limited to the maximum extent permitted by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Indemnification</h2>
            <p className="mb-4">
              You agree to defend, indemnify, and hold harmless Qash Solutions Inc. and its licensees and licensors, and their respective employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) resulting from or arising out of:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your access to and use of the Service, including any data or content transmitted or received by you</li>
              <li>Your violation of any term of these Terms, including without limitation your breach of any representations and warranties</li>
              <li>Your violation of any third-party right, including without limitation any intellectual property right, publicity right, confidentiality right, property right, or privacy right</li>
              <li>Your violation of any applicable law, rule, or regulation</li>
              <li>Any content you submit, post, or transmit through the Service, including but not limited to health information, medication data, or any other user content</li>
              <li>Any other party's access to and use of the Service with your unique username, password, or other appropriate security code</li>
              <li>Any claim that your use of the Service caused damage to a third party</li>
            </ul>
            <p className="mb-4">
              This defense and indemnification obligation will survive termination of these Terms and your use of the Service. We reserve the right to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which event you will assist and cooperate with us in asserting any available defenses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Dispute Resolution</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">14.1 Informal Resolution</h3>
            <p className="mb-4">
              Before filing a claim, you agree to contact us at admin@myguide.health and attempt to resolve the dispute informally for at least 30 days.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">14.2 Arbitration</h3>
            <p className="mb-4">
              Any dispute arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules, conducted in Texas, United States.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">14.3 Class Action Waiver</h3>
            <p className="mb-4">
              You agree to resolve disputes on an individual basis and waive the right to participate in class actions or class arbitrations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">15. Governing Law</h2>
            <p className="mb-4">
              These Terms are governed by the laws of the State of Texas and the United States, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">16. Changes to Terms</h2>
            <p className="mb-4">
              We may update these Terms from time to time. When we make changes, we will update the "Last Updated" date and post the revised Terms on this page.
            </p>
            <p className="mb-4">
              Your continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">17. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">18. Contact Us</h2>
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
