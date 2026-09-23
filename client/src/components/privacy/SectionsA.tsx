import { LegalSection } from "@/components/static/LegalSection";
import { PrivacySectionInfoCollected } from "./SectionInfoCollected";

/**
 * Privacy Policy sections 1–8 (copy verbatim from the previous page).
 * Section 2 (Information We Collect) lives in its own file to keep this
 * module under the 200-line cap.
 */
export function PrivacySectionsA() {
  return (
    <>
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          Prospectly, Inc. (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our,&rdquo;
          or &ldquo;Company&rdquo;) is committed to protecting your privacy and
          ensuring the security of your personal information. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your
          information when you use our lead generation platform, referral
          marketplace, and related services (collectively, the
          &ldquo;Service&rdquo;). By using our Service, you consent to the data
          practices described in this policy.
        </p>
      </LegalSection>

      <PrivacySectionInfoCollected />

      <LegalSection id="how-we-use" title="3. How We Use Your Information">
        <p>We use your personal information for the following purposes:</p>
        <h3>3.1 Service Provision</h3>
        <ul>
          <li>Providing and maintaining our lead generation and referral services</li>
          <li>Processing and managing your account, subscriptions, and payments</li>
          <li>Facilitating warm introductions and referral transactions</li>
          <li>Delivering campaign management and analytics tools</li>
          <li>Providing customer support and responding to inquiries</li>
        </ul>
        <h3>3.2 Business Operations</h3>
        <ul>
          <li>Improving our Service through analysis and research</li>
          <li>Developing new features and functionality</li>
          <li>Conducting security monitoring and fraud prevention</li>
          <li>Ensuring compliance with legal obligations</li>
          <li>Managing business transactions (mergers, acquisitions, etc.)</li>
        </ul>
        <h3>3.3 Communications</h3>
        <ul>
          <li>Sending transactional emails and service notifications</li>
          <li>Providing marketing communications (with your consent)</li>
          <li>Delivering newsletters and product updates</li>
          <li>Responding to your comments and questions</li>
        </ul>
      </LegalSection>

      <LegalSection id="legal-basis" title="4. Legal Basis for Processing (GDPR)">
        <p>
          For users in the European Economic Area (EEA), we process your
          personal data based on the following legal grounds:
        </p>
        <ul>
          <li>
            <strong>Contractual Necessity:</strong> To perform our contract with
            you and provide our services
          </li>
          <li>
            <strong>Legitimate Interests:</strong> To improve our services,
            ensure security, and conduct business operations
          </li>
          <li>
            <strong>Legal Compliance:</strong> To comply with applicable laws
            and regulations
          </li>
          <li>
            <strong>Consent:</strong> For marketing communications and optional
            features (which you may withdraw at any time)
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies and Tracking Technologies">
        <p>
          We use cookies, web beacons, and similar tracking technologies to
          enhance your experience and collect usage data. These technologies
          help us:
        </p>
        <ul>
          <li>Remember your preferences and settings</li>
          <li>Analyze usage patterns and improve our Service</li>
          <li>Provide personalized content and features</li>
          <li>Ensure security and prevent fraud</li>
          <li>Deliver targeted advertising (with your consent)</li>
        </ul>
        <p>
          We use Google Analytics to understand how visitors find and use our
          Service. It records the pages viewed and the campaign that referred
          you, in a form that identifies pages by type rather than by the
          specific record being viewed. Google processes this data under its own{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy policy
          </a>
          .
        </p>
        <p>
          You can control cookie settings through your browser preferences.
          However, disabling cookies may limit certain features of our Service.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. Information Sharing and Disclosure">
        <h3>6.1 Service Providers</h3>
        <p>
          We may share your information with trusted third-party service
          providers who assist us in operating our business, including cloud
          hosting providers, payment processors, email service providers, and
          analytics partners. These providers are contractually obligated to
          protect your information and use it only for specified purposes.
        </p>
        <h3>6.2 Referral Marketplace</h3>
        <p>
          To facilitate warm introductions, we may share limited contact
          information between users in our referral marketplace. This sharing
          occurs only with explicit consent from all parties involved.
        </p>
        <h3>6.3 Legal Requirements</h3>
        <p>
          We may disclose your information when required by law, legal process,
          or government request, or to protect our rights, property, or safety,
          or that of others.
        </p>
        <h3>6.4 Business Transfers</h3>
        <p>
          In the event of a merger, acquisition, or sale of assets, your
          information may be transferred as part of the business transaction.
        </p>
        <h3>6.5 Aggregated Data</h3>
        <p>
          We may share aggregated, de-identified data that cannot reasonably be
          used to identify you for research, analytics, or business purposes.
        </p>
      </LegalSection>

      <LegalSection id="data-security" title="7. Data Security">
        <p>
          We implement comprehensive security measures to protect your personal
          information, including:
        </p>
        <ul>
          <li>Encryption in transit and at rest using industry-standard protocols</li>
          <li>Access controls and authentication mechanisms</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Employee training on data protection and security practices</li>
          <li>Incident response procedures for potential data breaches</li>
        </ul>
        <p>
          While we strive to protect your information, no method of transmission
          or storage is 100% secure. We cannot guarantee absolute security but
          will notify you of any significant data breaches as required by law.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="8. Data Retention">
        <p>
          We retain your personal information for as long as necessary to
          provide our services, comply with legal obligations, resolve
          disputes, and enforce our agreements. Specific retention periods
          include:
        </p>
        <ul>
          <li>Account information: Until account deletion plus 30 days</li>
          <li>Transaction records: 7 years for financial and tax compliance</li>
          <li>Marketing data: Until you unsubscribe or withdraw consent</li>
          <li>Usage logs: 12 months for security and analytics purposes</li>
          <li>Support communications: 3 years for quality assurance</li>
        </ul>
      </LegalSection>
    </>
  );
}
