import { LegalSection } from "@/components/static/LegalSection";

/** Privacy Policy Section 2 — Information We Collect (verbatim). */
export function PrivacySectionInfoCollected() {
  return (
    <LegalSection id="information-collected" title="2. Information We Collect">
      <h3>2.1 Personal Information You Provide</h3>
      <p>
        We collect personal information that you voluntarily provide to us,
        including:
      </p>
      <ul>
        <li>Contact information (name, email address, phone number, mailing address)</li>
        <li>Professional information (job title, company name, industry, LinkedIn profile)</li>
        <li>Account credentials (username, password, security questions)</li>
        <li>Payment information (credit card details, billing address, tax information)</li>
        <li>Profile information (bio, profile picture, preferences, settings)</li>
        <li>Communication data (messages, emails, support tickets, feedback)</li>
        <li>Contact lists and prospect data you upload to our platform</li>
        <li>Campaign content (email templates, messages, call scripts)</li>
      </ul>

      <h3>2.2 Information Collected Automatically</h3>
      <p>We automatically collect certain information when you use our Service:</p>
      <ul>
        <li>Device information (IP address, browser type, operating system, device identifiers)</li>
        <li>Usage data (pages visited, features used, time spent, click patterns)</li>
        <li>Location data (general geographic location based on IP address)</li>
        <li>Log files (access times, error logs, performance data)</li>
        <li>Cookies and tracking technologies (as described in Section 5)</li>
      </ul>

      <h3>2.3 Information from Third Parties</h3>
      <p>We may receive information about you from third-party sources, including:</p>
      <ul>
        <li>Social media platforms (when you connect your accounts)</li>
        <li>Data providers and lead generation services</li>
        <li>Public databases and directories</li>
        <li>Business partners and referral sources</li>
        <li>Analytics and advertising partners</li>
      </ul>
    </LegalSection>
  );
}
