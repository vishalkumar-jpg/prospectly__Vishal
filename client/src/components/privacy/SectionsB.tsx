import { LegalSection } from "@/components/static/LegalSection";

/**
 * Privacy Policy sections 9–16 (copy verbatim from the previous page).
 */
export function PrivacySectionsB() {
  return (
    <>
      <LegalSection id="your-rights" title="9. Your Privacy Rights">
        <h3>9.1 General Rights</h3>
        <p>You have the following rights regarding your personal information:</p>
        <ul>
          <li>Access your personal data and obtain a copy</li>
          <li>Correct inaccurate or incomplete information</li>
          <li>Delete your personal data (subject to legal requirements)</li>
          <li>Object to or restrict certain types of processing</li>
          <li>Data portability (receive your data in a structured format)</li>
          <li>Withdraw consent for marketing communications</li>
        </ul>
        <h3>9.2 California Privacy Rights (CCPA)</h3>
        <p>California residents have additional rights, including:</p>
        <ul>
          <li>Right to know what personal information is collected and how it&apos;s used</li>
          <li>Right to delete personal information (with certain exceptions)</li>
          <li>Right to opt out of the sale of personal information</li>
          <li>Right to non-discrimination for exercising privacy rights</li>
        </ul>
        <h3>9.3 Exercising Your Rights</h3>
        <p>
          To exercise your privacy rights, contact us at privacy@prospectly.com.
          We will respond to your request within 30 days (or as required by
          applicable law). We may need to verify your identity before
          processing your request.
        </p>
      </LegalSection>

      <LegalSection id="international" title="10. International Data Transfers">
        <p>
          Your information may be processed and stored in countries other than
          your own, including the United States. We ensure adequate protection
          for international transfers through:
        </p>
        <ul>
          <li>Standard Contractual Clauses approved by the European Commission</li>
          <li>Adequacy decisions by relevant data protection authorities</li>
          <li>Privacy Shield frameworks (where applicable)</li>
          <li>Other appropriate safeguards as required by law</li>
        </ul>
      </LegalSection>

      <LegalSection id="childrens-privacy" title="11. Children’s Privacy">
        <p>
          Our Service is not intended for children under 16 years of age. We do
          not knowingly collect personal information from children under 16. If
          you are a parent or guardian and believe your child has provided us
          with personal information, please contact us immediately. We will
          delete such information from our records.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="12. Third-Party Services">
        <p>
          Our Service may contain links to third-party websites, applications,
          or services. This Privacy Policy does not apply to these third-party
          services. We encourage you to review the privacy policies of any
          third-party services you access through our platform.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes in our practices, technology, legal requirements, or other
          factors. We will notify you of material changes by email or through
          our Service at least 30 days before the changes take effect. Your
          continued use of our Service after the effective date constitutes
          acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="dpo" title="14. Data Protection Officer">
        <p>
          We have appointed a Data Protection Officer (DPO) to oversee our data
          protection practices and serve as a point of contact for
          privacy-related matters. You may contact our DPO at:
          dpo@prospectly.com
        </p>
      </LegalSection>

      <LegalSection id="supervisory" title="15. Supervisory Authority">
        <p>
          If you are located in the EEA and have concerns about our data
          processing practices, you have the right to lodge a complaint with
          your local data protection supervisory authority.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="16. Contact Information">
        <p>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy or our data practices, please contact us:
        </p>
        <div className="mt-4 rounded-xl border border-home-border bg-home-bg-elevated p-4 text-sm">
          <p className="font-semibold text-home-fg">Prospectly, Inc.</p>
          <p>Privacy Team</p>
          <p>Email: privacy@prospectly.com</p>
          <p>Data Protection Officer: dpo@prospectly.com</p>
          <p>
            Address: 407 N Pacific Coast Highway, Ste 584, Redondo Beach, CA
            90277
          </p>
          <p>Phone: (310) 863-4343</p>
        </div>
      </LegalSection>
    </>
  );
}
