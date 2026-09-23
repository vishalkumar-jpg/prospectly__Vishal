import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";
import { PageStructuredData } from "@/components/StructuredData";
import { ContactHero } from "@/components/contact/Hero";
import { ContactFaqGrid, type ContactFaq } from "@/components/contact/FaqGrid";
import { ContactEmailCallout } from "@/components/contact/EmailCallout";
// Live chat / support channel / self-serve sections are disabled — email is the
// only support path for now.
// import { useToast } from "@/hooks/use-toast";
// import { ContactSupportChannels } from "@/components/contact/SupportChannels";
// import { ContactSelfServeLinks } from "@/components/contact/SelfServeLinks";

const SUPPORT_EMAIL = "support@prospectly.com";
// const BILLING_EMAIL = "billing@prospectly.com";

const FAQS: ContactFaq[] = [
  {
    question: "How quickly will I receive a response?",
    answer:
      "Email inquiries are answered within 4 hours during business hours.",
  },
  {
    question: "What's included in my subscription?",
    answer:
      "All plans include unlimited warm introductions, AI-powered prospecting, multi-channel outreach, and 24/7 support. Premium features vary by plan.",
  },
  {
    question: "Can I integrate Prospectly with my existing CRM?",
    answer:
      "Yes! We support integrations with Salesforce, HubSpot, Pipedrive, and 50+ other platforms. Our API allows custom integrations as well.",
  },
  {
    question: "How does the warm introduction marketplace work?",
    answer:
      "Our community of verified professionals helps make introductions to your prospects in exchange for referral payouts. It's peer-to-peer networking at scale.",
  },
  {
    question: "What security measures do you have in place?",
    answer:
      "We use enterprise-grade encryption, SOC 2 compliance, and regular security audits. Your data is protected with bank-level security.",
  },
  {
    question: "How is my privacy protected?",
    answer:
      "Your data is never sold or shared without consent. We use end-to-end encryption, give you full control over your information, and maintain transparent privacy practices. Contact privacy@prospectly.com for questions.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel anytime. No long-term contracts required. We believe in earning your business every month.",
  },
];

const Contact = () => {
  // const { toast } = useToast();

  // const startLiveChat = (type?: string) => {
  //   toast({
  //     title: "Starting Live Chat",
  //     description: type
  //       ? `Connecting you with our ${type} support specialist…`
  //       : "Connecting you with our support team…",
  //   });
  // };

  // const handleOpenBooking = () => {
  //   toast({
  //     title: "Opening Calendar",
  //     description: "Redirecting to our booking page…",
  //   });
  // };

  // const handleOpenSecurityDocs = () => {
  //   toast({
  //     title: "Opening Security Docs",
  //     description: "Redirecting to our security documentation…",
  //   });
  // };

  return (
    <div className="min-h-screen bg-home-bg text-home-fg">
      <SEO
        title="Contact Us — Get Support | Prospectly"
        description="Need help? Email our support team at support@prospectly.com for technical, billing, and sales questions."
        canonical="/contact"
      />
      <PageStructuredData
        page="contact"
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
        faqs={FAQS}
      />
      <Navigation marketingSurface />
      <main id="main-content">
        <ContactHero supportEmail={SUPPORT_EMAIL} />
        {/* <ContactSupportChannels
          startChat={startLiveChat}
          onOpenBooking={handleOpenBooking}
          onOpenSecurityDocs={handleOpenSecurityDocs}
          billingEmail={BILLING_EMAIL}
        /> */}
        {/* <ContactSelfServeLinks /> */}
        <ContactFaqGrid faqs={FAQS} />
        <ContactEmailCallout supportEmail={SUPPORT_EMAIL} />
      </main>
      <WebsiteFooter />
    </div>
  );
};

export default Contact;
