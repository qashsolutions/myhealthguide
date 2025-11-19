export default function HipaaNoticePage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">HIPAA Notice of Privacy Practices</h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            <strong>Effective Date:</strong> November 18, 2025
            <br />
            <strong>Last Updated:</strong> November 18, 2025
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 p-6 mb-8">
            <p className="text-sm font-semibold mb-2">THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.</p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Contact Information</h2>
            <p className="mb-4">
              <strong>Covered Entity:</strong> Qash Solutions Inc.
              <br />
              <strong>Service:</strong> myguide.health
              <br />
              <strong>DUNS Number:</strong> 119536275
              <br />
              <strong>Location:</strong> Texas, United States
              <br />
              <strong>Contact Email:</strong> admin@myguide.health
              <br />
              <strong>Privacy Officer:</strong> Contact via admin@myguide.health
              <br />
              <strong>Response Time:</strong> Within 5 business days
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Commitment to Your Privacy</h2>
            <p className="mb-4">
              We are required by law to maintain the privacy of your Protected Health Information (PHI) and to provide you with this Notice of our legal duties and privacy practices with respect to PHI.
            </p>
            <p className="mb-4">
              We are required to abide by the terms of this Notice currently in effect. We reserve the right to change the terms of this Notice and to make the new Notice provisions effective for all PHI that we maintain. If we make material changes to our privacy practices, we will post the revised Notice on our website and update the effective date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">What is Protected Health Information (PHI)?</h2>
            <p className="mb-4">
              PHI is information about you, including demographic information, that may identify you and relates to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your past, present, or future physical or mental health or condition</li>
              <li>The provision of health care to you</li>
              <li>The past, present, or future payment for the provision of health care to you</li>
            </ul>
            <p className="mb-4">
              In our Service, PHI includes but is not limited to: medications and dosages, health assessments, diet and nutrition information, medical conditions, supplement usage, and care notes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We May Use and Disclose Your PHI</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">1. Uses and Disclosures WITH Your Authorization</h3>
            <p className="mb-4">
              We require your explicit written authorization before using or disclosing your PHI for most purposes. You have provided authorization by:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Creating an account and agreeing to our Terms of Service</li>
              <li>Providing explicit consent for medical features (drug interactions, health assessments)</li>
              <li>Adding family members or caregivers to your care group</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Uses and Disclosures for Treatment, Payment, and Health Care Operations</h3>

            <p className="mb-4"><strong>For Treatment:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Care Coordination:</strong> We share your medication schedules, health assessments, and care notes with authorized family members and caregivers you designate within your care group</li>
              <li><strong>AI Health Analysis:</strong> We use Google Gemini AI to analyze your medication compliance, diet entries, and generate health summaries to assist in your care</li>
              <li><strong>Drug Safety:</strong> We share medication names (but not your identity) with the FDA OpenFDA API to check for drug interactions and side effects</li>
              <li><strong>Medication Reminders:</strong> We send SMS and email notifications about your medication schedules</li>
            </ul>

            <p className="mb-4"><strong>For Payment:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We share your Stripe customer ID with Stripe to process subscription payments</li>
              <li>We do not share health information with payment processors</li>
            </ul>

            <p className="mb-4"><strong>For Health Care Operations:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Quality improvement and service enhancement</li>
              <li>Customer support and troubleshooting</li>
              <li>Security monitoring and fraud prevention</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Uses and Disclosures to Business Associates</h3>
            <p className="mb-4">
              We may disclose your PHI to our Business Associates who perform services on our behalf. We have Business Associate Agreements (BAAs) with these entities requiring them to safeguard your PHI:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Google/Firebase:</strong> Cloud infrastructure, database storage, file storage, authentication</li>
              <li><strong>Google Gemini AI:</strong> Health summaries, medication analysis, diet analysis</li>
              <li><strong>Twilio:</strong> SMS notifications for medication reminders and health alerts</li>
              <li><strong>SendGrid:</strong> Email notifications</li>
            </ul>
            <p className="mb-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 rounded">
              <strong>Note:</strong> We are actively obtaining formal BAAs from all vendors. Until BAAs are in place, use of this Service for PHI may not be fully HIPAA compliant.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Other Uses and Disclosures</h3>
            <p className="mb-4">We may use or disclose your PHI without your authorization in the following situations:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Required by Law:</strong> When required by federal, state, or local law</li>
              <li><strong>Public Health Activities:</strong> To prevent or control disease, injury, or disability</li>
              <li><strong>Health Oversight Activities:</strong> To authorized health oversight agencies for audits, investigations, or inspections</li>
              <li><strong>Legal Proceedings:</strong> In response to court orders, subpoenas, or discovery requests</li>
              <li><strong>Law Enforcement:</strong> For law enforcement purposes as required by law</li>
              <li><strong>To Avert Serious Threat:</strong> To prevent a serious and imminent threat to health or safety</li>
              <li><strong>Emergency Situations:</strong> In emergency treatment situations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Your Rights Regarding Your PHI</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">1. Right to Access Your PHI</h3>
            <p className="mb-4">
              You have the right to inspect and obtain a copy of your PHI. You can access all your health information through your dashboard at any time. You may also request a copy by contacting us at admin@myguide.health.
            </p>
            <p className="mb-4">
              We will provide your PHI within 30 days of your request. We may charge a reasonable, cost-based fee for copying and postage.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Right to Request Amendment</h3>
            <p className="mb-4">
              If you believe that your PHI is incorrect or incomplete, you may request that we amend it. You can update most information directly through your dashboard settings. For other amendments, contact us at admin@myguide.health.
            </p>
            <p className="mb-4">
              We will respond to your amendment request within 60 days. We may deny your request if the information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Was not created by us</li>
              <li>Is not part of the records we maintain</li>
              <li>Is not information you would be permitted to inspect and copy</li>
              <li>Is accurate and complete as is</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Right to an Accounting of Disclosures</h3>
            <p className="mb-4">
              You have the right to receive an accounting of certain disclosures of your PHI made by us during the six years prior to your request. This does not include:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Disclosures for treatment, payment, and health care operations</li>
              <li>Disclosures made to you</li>
              <li>Disclosures you authorized</li>
              <li>Disclosures to persons involved in your care</li>
            </ul>
            <p className="mb-4">
              To request an accounting, contact us at admin@myguide.health. We will provide the first accounting within 12 months free of charge.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Right to Request Restrictions</h3>
            <p className="mb-4">
              You have the right to request restrictions on how we use or disclose your PHI. You can request restrictions through your account settings or by contacting us.
            </p>
            <p className="mb-4">
              We are not required to agree to your request except in the case where you pay out-of-pocket in full for a service and request that we not disclose PHI related to that service to your health plan.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. Right to Request Confidential Communications</h3>
            <p className="mb-4">
              You have the right to request that we communicate with you about your PHI in a certain way or at a certain location. You can specify your preferred communication method in your account settings or by contacting us.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. Right to a Paper Copy of This Notice</h3>
            <p className="mb-4">
              You have the right to receive a paper copy of this Notice upon request. To request a paper copy, contact us at admin@myguide.health.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7. Right to Revoke Authorization</h3>
            <p className="mb-4">
              You may revoke your authorization for us to use or disclose your PHI at any time by:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Revoking medical feature consent in your account settings</li>
              <li>Removing family members or caregivers from your care group</li>
              <li>Deleting your account entirely</li>
            </ul>
            <p className="mb-4">
              Your revocation will not affect any uses or disclosures already made in reliance on your authorization.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">8. Right to Be Notified of a Breach</h3>
            <p className="mb-4">
              You have the right to be notified in the event of a breach of your unsecured PHI. We will notify you within 72 hours of discovering a breach.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Responsibilities</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We are required by law to maintain the privacy and security of your PHI</li>
              <li>We will notify you promptly if a breach occurs that may have compromised the privacy or security of your PHI</li>
              <li>We must follow the duties and privacy practices described in this Notice</li>
              <li>We will not use or share your PHI other than as described here unless you give us written permission</li>
              <li>If you give us permission, you may change your mind at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Protect Your PHI</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">Technical Safeguards</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Encryption:</strong> All data encrypted in transit (HTTPS/TLS) and at rest (Firebase encryption)</li>
              <li><strong>Access Controls:</strong> Authentication required; role-based access control; minimum necessary access</li>
              <li><strong>Audit Controls:</strong> All PHI access is logged with user ID, timestamp, and action taken</li>
              <li><strong>Automatic Logoff:</strong> Sessions expire after 24 hours of inactivity</li>
              <li><strong>Integrity Controls:</strong> Protected fields prevent unauthorized modifications</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Physical Safeguards</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Data stored in secure Google Cloud data centers with enterprise-grade physical security</li>
              <li>Redundant backups and disaster recovery procedures</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Administrative Safeguards</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Designated Privacy and Security Officers</li>
              <li>Regular security risk assessments</li>
              <li>Workforce training on HIPAA compliance</li>
              <li>Incident response procedures</li>
              <li>Business Associate Agreements with all vendors handling PHI</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Minimum Necessary Standard</h2>
            <p className="mb-4">
              When using or disclosing PHI, we make reasonable efforts to limit the information to the minimum necessary to accomplish the intended purpose. For example:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Caregivers can only access PHI for elders specifically assigned to them</li>
              <li>Family members can only access PHI for elders in their care group</li>
              <li>AI analysis receives only the minimum data needed for the specific analysis requested</li>
              <li>Drug interaction checks send only medication names, not patient identities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Marketing and Sale of PHI</h2>
            <p className="mb-4">
              <strong>We do not:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Use your PHI for marketing purposes</li>
              <li>Sell your PHI to third parties</li>
              <li>Send you marketing communications (all emails and SMS are transactional only)</li>
            </ul>
            <p className="mb-4">
              If we ever wish to use PHI for marketing or sell PHI, we will obtain your written authorization first.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Notice</h2>
            <p className="mb-4">
              We reserve the right to change this Notice. We reserve the right to make the revised or changed Notice effective for PHI we already have about you as well as any information we receive in the future.
            </p>
            <p className="mb-4">
              We will post the current Notice on our website with the effective date. You may also request a copy of the current Notice at any time by contacting us at admin@myguide.health.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Complaints</h2>
            <p className="mb-4">
              If you believe your privacy rights have been violated, you may file a complaint with us or with the U.S. Department of Health and Human Services (HHS).
            </p>

            <p className="mb-4"><strong>To file a complaint with us:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Email: admin@myguide.health</li>
              <li>Subject Line: "HIPAA Privacy Complaint"</li>
              <li>Include: Your name, contact information, and description of the issue</li>
            </ul>

            <p className="mb-4"><strong>To file a complaint with HHS:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Office for Civil Rights, U.S. Department of Health and Human Services</li>
              <li>Website: <a href="https://www.hhs.gov/ocr/privacy/hipaa/complaints/" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">www.hhs.gov/ocr/privacy/hipaa/complaints/</a></li>
              <li>Phone: 1-877-696-6775</li>
            </ul>

            <p className="mb-4">
              <strong>You will not be penalized or retaliated against for filing a complaint.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Questions</h2>
            <p className="mb-4">
              If you have questions about this Notice or need more information, please contact:
            </p>
            <p className="mb-4">
              <strong>Privacy Officer</strong>
              <br />
              Qash Solutions Inc.
              <br />
              Email: admin@myguide.health
              <br />
              Response Time: Within 5 business days
            </p>
          </section>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-12">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <strong>Acknowledgment of Receipt</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              By using myguide.health, you acknowledge that you have been provided access to this Notice of Privacy Practices. We may request that you sign a written acknowledgment of receipt, which will be retained in our records.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Related Documents:</strong>
            </p>
            <ul className="text-sm space-y-2 mt-3">
              <li>
                <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </a> - General data privacy practices
              </li>
              <li>
                <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Terms of Service
                </a> - Terms and conditions of use
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
