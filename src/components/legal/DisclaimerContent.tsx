import React from 'react';

/**
 * Medical disclaimer content component
 * Legal text formatted for accessibility
 */
export function DisclaimerContent(): JSX.Element {
  return (
    <div className="prose prose-elder max-w-none">
      <h2 className="text-elder-xl font-bold mb-4">Medical Information Disclaimer</h2>
      
      <div className="space-y-6 text-elder-base">
        <section>
          <h3 className="text-elder-lg font-semibold mb-2">1. Not Medical Advice</h3>
          <p className="text-elder-text-secondary">
            The information provided by MyHealth Guide, including but not limited to text, 
            graphics, images, and other material contained on this website or mobile application 
            (collectively, "Content"), is for informational purposes only. The Content is not 
            intended to be a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">2. AI-Generated Content</h3>
          <p className="text-elder-text-secondary">
            MyHealth Guide uses artificial intelligence (AI) technology to analyze medication 
            interactions and provide health information. While we strive for accuracy, AI systems 
            have limitations and may not capture all possible interactions, contraindications, 
            or individual health factors. The AI-generated content should never be the sole basis 
            for making health decisions.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">3. Always Seek Professional Advice</h3>
          <p className="text-elder-text-secondary">
            Always seek the advice of your physician, pharmacist, or other qualified health 
            provider with any questions you may have regarding a medical condition or medication. 
            Never disregard professional medical advice or delay in seeking it because of something 
            you have read on MyHealth Guide.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">4. Emergency Situations</h3>
          <p className="text-elder-text-secondary font-semibold">
            If you think you may have a medical emergency, call your doctor, go to the emergency 
            department, or call 911 immediately. MyHealth Guide is not designed for emergency 
            medical situations and should not be used for urgent medical needs.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">5. No Doctor-Patient Relationship</h3>
          <p className="text-elder-text-secondary">
            Use of MyHealth Guide does not create a doctor-patient relationship between you and 
            MyHealth Guide or any of its representatives. The platform is not a substitute for 
            in-person consultation with healthcare professionals.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">6. Accuracy and Completeness</h3>
          <p className="text-elder-text-secondary">
            While we make every effort to ensure the information is accurate and up-to-date, 
            medicine is an ever-changing field. New research and clinical experience broaden 
            our knowledge continuously. We make no representations or warranties of any kind, 
            express or implied, about the completeness, accuracy, reliability, suitability, 
            or availability of the information contained on this platform.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">7. Individual Variations</h3>
          <p className="text-elder-text-secondary">
            Medical information can vary greatly from person to person. Factors such as age, 
            weight, gender, specific health conditions, other medications, and individual 
            sensitivities can all affect how medications work and interact. MyHealth Guide 
            cannot account for all individual variations.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">8. Limitation of Liability</h3>
          <p className="text-elder-text-secondary">
            In no event will MyHealth Guide, its affiliates, or their licensors, service providers, 
            employees, agents, officers, or directors be liable for damages of any kind arising 
            out of or in connection with your use of the platform. This includes, without limitation, 
            direct, indirect, incidental, punitive, and consequential damages.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">9. Changes to This Disclaimer</h3>
          <p className="text-elder-text-secondary">
            We reserve the right to make changes to this disclaimer at any time. Your continued 
            use of the platform after any such changes constitutes your acceptance of the new terms.
          </p>
        </section>

        <section>
          <h3 className="text-elder-lg font-semibold mb-2">10. Contact Information</h3>
          <p className="text-elder-text-secondary">
            If you have any questions about this Medical Disclaimer, please contact us at 
            admin@myguide.health.
          </p>
        </section>
      </div>

      <div className="mt-8 p-4 bg-primary-50 border-2 border-primary-200 rounded-elder">
        <p className="text-elder-base font-semibold text-primary-800">
          By using MyHealth Guide, you acknowledge that you have read, understood, and agree 
          to be bound by this Medical Disclaimer.
        </p>
      </div>
    </div>
  );
}