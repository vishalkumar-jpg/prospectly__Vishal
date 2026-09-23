import { LegalSection } from "@/components/static/LegalSection";

/**
 * Terms of Service sections 9–15 (copy verbatim from the previous page).
 */
export function TermsSectionsB() {
  return (
    <>
      <LegalSection id="indemnification" title="9. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless the Company, its
          officers, directors, employees, and agents from and against any and
          all claims, damages, losses, costs, and expenses (including
          reasonable attorneys&apos; fees) arising out of or relating to: (a)
          your use of the Service; (b) your violation of these Terms; (c) your
          violation of any applicable laws or regulations; or (d) any content
          you submit or transmit through the Service.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="10. Termination">
        <h3>10.1 Termination Rights</h3>
        <p>
          Either party may terminate this agreement at any time with or without
          cause. We reserve the right to suspend or terminate your account
          immediately if you violate these Terms or engage in prohibited
          activities.
        </p>
        <h3>10.2 Effects of Termination</h3>
        <p>
          Upon termination, your right to access and use the Service will cease
          immediately. We may delete your account and data, though we may
          retain certain information as required by law or for legitimate
          business purposes.
        </p>
      </LegalSection>

      <LegalSection id="disputes" title="11. Dispute Resolution">
        <h3>11.1 Mandatory Arbitration</h3>
        <p>
          Any dispute, claim, or controversy arising out of or relating to
          these Terms shall be resolved through binding arbitration
          administered by the American Arbitration Association (AAA) under its
          Commercial Arbitration Rules. The arbitration shall be conducted by a
          single arbitrator in the state of Delaware.
        </p>
        <h3>11.2 Class Action Waiver</h3>
        <p>
          YOU WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS, CLASS
          ARBITRATIONS, OR REPRESENTATIVE ACTIONS. ALL DISPUTES MUST BE BROUGHT
          IN YOUR INDIVIDUAL CAPACITY.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="12. Governing Law & Jurisdiction">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the State of Delaware, without regard to its conflict of law
          principles. To the extent arbitration does not apply, you consent to
          the exclusive jurisdiction of the state and federal courts located in
          Delaware.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to Terms">
        <p>
          We reserve the right to modify these Terms at any time. We will
          provide notice of material changes by email or through the Service.
          Your continued use of the Service after such notice constitutes
          acceptance of the modified Terms. If you do not agree to the changes,
          you must stop using the Service.
        </p>
      </LegalSection>

      <LegalSection id="severability" title="14. Severability & Entire Agreement">
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions shall remain in full force
          and effect. These Terms, together with our Privacy Policy, constitute
          the entire agreement between you and us regarding the Service and
          supersede all prior agreements and understandings.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="15. Contact Information">
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <div className="mt-4 rounded-xl border border-home-border bg-home-bg-elevated p-4 text-sm">
          <p className="font-semibold text-home-fg">Prospectly LLC</p>
          <p>Legal Department</p>
          <p>Email: legal@prospectly.com</p>
        </div>
      </LegalSection>
    </>
  );
}
