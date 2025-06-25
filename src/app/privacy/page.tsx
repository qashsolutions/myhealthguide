import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for MyHealth Guide - Learn how we collect, use, and protect your health information.',
};

/**
 * Privacy Policy page
 * Converted from HTML with exact same styling using Tailwind CSS
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-[800px] mx-auto p-5">
        {/* Main Section */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h1 className="text-3xl font-bold text-[#2c3e50] border-b-2 border-[#3498db] pb-2.5 mb-4">
            Privacy Policy
          </h1>
          <p className="italic text-[#666] mb-1">Effective Date: June 25, 2025</p>
          <p className="italic text-[#666] mb-4">Last Updated: June 25, 2025</p>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            This Privacy Policy describes how <span className="font-bold">Qash Solutions Inc.</span> (D-U-N-S® Number: 119536275), 
            operating as <span className="font-bold">MyGuide Health</span> ("MyGuide," "we," "us," or "our"), 
            collects, uses, and shares information about you when you use our MyGuide Health mobile application 
            (the "App") and related services (collectively, the "Services").
          </p>
          
          <p className="text-[#333] leading-[1.6]">
            By using our Services, you agree to the collection and use of information in accordance with this 
            Privacy Policy. If you do not agree with our policies and practices, please do not use our Services.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            1. Information We Collect
          </h2>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">1.1 Information You Provide to Us</h3>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Account Information:</strong> When you create an account, we collect your name, email address, 
              phone number, and authentication credentials.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Health Information:</strong> We collect information about your medications, supplements, 
              dietary restrictions, medical conditions, and healthcare providers that you choose to enter into the App.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Caregiver Information:</strong> If you invite caregivers or family members, we collect their 
              email addresses and manage their access permissions.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Communications:</strong> We collect information when you contact us for support or provide feedback.
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">1.2 Information We Collect Automatically</h3>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Device Information:</strong> We collect device identifiers, operating system version, 
              app version, and device model.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Usage Data:</strong> We collect information about how you interact with our App, 
              including features used, actions taken, and time spent.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Analytics Data:</strong> We use analytics tools to understand app performance and 
              user behavior in aggregate.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Push Notification Tokens:</strong> If you enable push notifications, we collect and 
              store Firebase Cloud Messaging (FCM) tokens to send you notifications.
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">1.3 Information from Third-Party Services</h3>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Authentication Providers:</strong> If you sign in using Google, we receive your name, 
              email address, and profile picture from Google.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Contacts:</strong> With your permission, we may access your device contacts to help 
              you invite healthcare providers or caregivers.
            </li>
          </ul>
        </div>

        {/* Section 2: How We Use Your Information */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            2. How We Use Your Information
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">We use the information we collect to:</p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Provide Services:</strong> Enable you to track medications, detect conflicts, and 
              coordinate care with caregivers.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>AI-Powered Features:</strong> Use Claude AI to analyze potential medication interactions 
              and provide conflict alerts. Note: We send only medication names and dosages to Claude AI, 
              never personal identifiers.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Notifications:</strong> Send medication reminders, caregiver task assignments, and important alerts.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Account Management:</strong> Create and manage your account, authenticate users, and manage permissions.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Communication:</strong> Respond to your inquiries, send service updates, and provide customer support.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Improvements:</strong> Analyze usage patterns to improve our Services and develop new features.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Legal Compliance:</strong> Comply with legal obligations and enforce our Terms of Service.
            </li>
          </ul>
        </div>

        {/* Section 3: How We Share Your Information */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            3. How We Share Your Information
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            We do not sell, rent, or trade your personal information. We share information only in the following circumstances:
          </p>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">3.1 With Your Consent</h3>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Caregivers and Family Members:</strong> We share medication and task information with 
              caregivers you explicitly authorize.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Healthcare Providers:</strong> We may share information with healthcare providers at your direction.
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">3.2 Service Providers</h3>
          <p className="mb-4 text-[#333] leading-[1.6]">
            We work with third-party service providers who assist us in operating our Services:
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Firebase (Google):</strong> For authentication, database storage, and push notifications
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Claude AI (Anthropic):</strong> For medication conflict analysis (anonymized data only)
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Apple:</strong> For app distribution and in-app services
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">3.3 Legal Requirements</h3>
          <p className="mb-4 text-[#333] leading-[1.6]">
            We may disclose information if required by law, court order, or government request, or if we believe 
            disclosure is necessary to:
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">Comply with legal obligations</li>
            <li className="mb-2 text-[#333] leading-[1.6]">Protect our rights, property, or safety</li>
            <li className="mb-2 text-[#333] leading-[1.6]">Prevent fraud or security issues</li>
            <li className="mb-2 text-[#333] leading-[1.6]">Protect against legal liability</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">3.4 Business Transfers</h3>
          <p className="text-[#333] leading-[1.6]">
            In the event of a merger, acquisition, or sale of assets, your information may be transferred to 
            the acquiring entity, subject to the same privacy protections.
          </p>
        </div>

        {/* Section 4: Data Security */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            4. Data Security
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            We implement appropriate technical and organizational measures to protect your information:
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Encryption:</strong> All data is encrypted in transit using TLS and at rest using 
              industry-standard encryption.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Access Controls:</strong> We limit access to personal information to authorized 
              personnel who need it to perform their duties.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Authentication:</strong> We use Firebase Authentication with support for multi-factor 
              authentication (MFA).
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Local Storage:</strong> Sensitive health data is primarily stored locally on your 
              device using Core Data with encryption.
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Regular Audits:</strong> We regularly review and update our security practices.
            </li>
          </ul>
          
          <p className="text-[#333] leading-[1.6]">
            While we strive to protect your information, no method of transmission or storage is 100% secure. 
            We cannot guarantee absolute security.
          </p>
        </div>

        {/* Section 5: Your Rights and Choices */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            5. Your Rights and Choices
          </h2>
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">5.1 Access and Update</h3>
          <p className="mb-4 text-[#333] leading-[1.6]">
            You can access and update your personal information directly within the App settings.
          </p>
          
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">5.2 Push Notifications</h3>
          <p className="mb-4 text-[#333] leading-[1.6]">
            You can control push notifications through your device settings or within the App.
          </p>
          
          
          <h3 className="text-xl font-semibold text-[#2c3e50] mt-5 mb-3">5.3 Analytics</h3>
          <p className="text-[#333] leading-[1.6]">
            You can opt out of analytics collection in the App settings.
          </p>
        </div>

        {/* Section 6: Data Retention */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            6. Data Retention
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            We retain your information for as long as necessary to provide our Services and fulfill the 
            purposes outlined in this Privacy Policy:
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Active Account Data:</strong> Retained as long as your account is active
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Deleted Account Data:</strong> Deleted within 90 days of account deletion request
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Backup Data:</strong> May be retained in backups for up to 180 days
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Legal Obligations:</strong> Some data may be retained longer if required by law
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              <strong>Anonymized Data:</strong> May be retained indefinitely for analytics and improvements
            </li>
          </ul>
        </div>

        {/* Section 7: Children's Privacy */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            7. Children's Privacy
          </h2>
          
          <p className="text-[#333] leading-[1.6]">
            Our Services are not intended for children under 18 years of age. We do not knowingly collect 
            personal information from children under 18. If we become aware that we have collected information 
            from a child under 18, we will take steps to delete such information.
          </p>
        </div>

        {/* Section 8: International Data Transfers */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            8. International Data Transfers
          </h2>
          
          <p className="text-[#333] leading-[1.6]">
            Our information is stored only in servers in the United States and never transferred out. 
            All data processing occurs within the United States. We ensure appropriate safeguards are in 
            place to protect your information in accordance with this Privacy Policy.
          </p>
        </div>

        {/* Section 9: California Privacy Rights */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            9. California Privacy Rights
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            If you are a California resident, you have additional rights under the California Consumer 
            Privacy Act (CCPA):
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              Right to know what personal information we collect, use, and share
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              Right to delete personal information (with certain exceptions)
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              Right to opt-out of the sale of personal information (we do not sell personal information)
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              Right to non-discrimination for exercising your privacy rights
            </li>
          </ul>
          
          <p className="text-[#333] leading-[1.6]">
            To exercise these rights, please contact us using the information below.
          </p>
        </div>

        {/* Section 10: Changes to This Privacy Policy */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            10. Changes to This Privacy Policy
          </h2>
          
          <p className="mb-4 text-[#333] leading-[1.6]">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by:
          </p>
          <ul className="pl-[25px] list-disc">
            <li className="mb-2 text-[#333] leading-[1.6]">
              Updating the "Last Updated" date at the top of this policy
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              Sending an in-app notification
            </li>
            <li className="mb-2 text-[#333] leading-[1.6]">
              Sending an email to your registered email address
            </li>
          </ul>
          
          <p className="text-[#333] leading-[1.6]">
            Your continued use of our Services after such modifications constitutes your acknowledgment and 
            agreement to the updated Privacy Policy.
          </p>
        </div>

        {/* Section 11: Contact Us */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            11. Contact Us
          </h2>
          
          <div className="bg-[#e8f4f8] p-[15px] rounded-[5px] mt-5">
            <p className="mb-4 text-[#333] leading-[1.6]">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            
            <p className="mb-4 text-[#333] leading-[1.6]">
              <strong>Qash Solutions Inc.</strong><br />
              Operating as: MyGuide Health<br />
              D-U-N-S® Number: 119536275<br />
              Email: <a href="mailto:admin@myguide.health" className="text-blue-600 hover:underline">admin@myguide.health</a><br />
              Website: <a href="https://myguide.health" className="text-blue-600 hover:underline">https://myguide.health</a>
            </p>
            
            <p className="text-[#333] leading-[1.6]">
              For support inquiries: <a href="mailto:support@myguide.health" className="text-blue-600 hover:underline">support@myguide.health</a>
            </p>
          </div>
        </div>

        {/* Section 12: Privacy Policy Summary */}
        <div className="bg-white p-5 mb-5 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <h2 className="text-2xl font-bold text-[#2c3e50] mt-[30px] border-b border-[#e0e0e0] pb-[5px] mb-4">
            12. Privacy Policy Summary
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse my-5">
              <thead>
                <tr>
                  <th className="border border-[#ddd] p-2 text-left bg-[#f2f2f2] text-[#333]">
                    What We Collect
                  </th>
                  <th className="border border-[#ddd] p-2 text-left bg-[#f2f2f2] text-[#333]">
                    Why We Collect It
                  </th>
                  <th className="border border-[#ddd] p-2 text-left bg-[#f2f2f2] text-[#333]">
                    Who We Share It With
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Account information (name, email, phone)
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Account creation and authentication
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Firebase (authentication service)
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Health information (medications, conditions)
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Provide medication management services
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Authorized caregivers (with your consent)
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Voice commands (converted to text)
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Enable voice-first interaction
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Processed locally, not shared
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Usage analytics
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Improve app performance and features
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Aggregated data only, no personal info
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Push notification tokens
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Send medication reminders and alerts
                  </td>
                  <td className="border border-[#ddd] p-2 text-[#333]">
                    Firebase Cloud Messaging
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}