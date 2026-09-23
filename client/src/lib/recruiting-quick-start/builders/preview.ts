import { IC } from "../icons";

/** Demo job data — matches Post a Job walkthrough form fields. */
const DEMO = {
  company: "Seno Technolab",
  title: "Principal AI Engineer",
  industry: "Technology",
  department: "Engineering",
  experience: "Lead / Staff",
  workType: "Hybrid",
  location: "Ahmedabad, Gujarat, India",
  salary: "$10 – $50 /hr",
  successFee: "$5,000",
  probationDays: 90,
  requiredSkills: ["Python", "LLMs", "System Design"],
  preferredSkills: ["AWS", "Kubernetes"],
  description:
    "We are seeking a Principal AI Engineer to lead architecture and deployment of enterprise AI solutions across LLMs and predictive analytics. You will partner with product and engineering leaders to deliver scalable, production-grade systems.",
  requirements:
    "8+ years in software engineering with strong Python and distributed systems experience. Proven track record shipping ML systems to production. Excellent communication and cross-functional leadership skills.",
  responsibilities:
    "Lead AI architecture decisions across the platform. Mentor senior engineers and set engineering standards. Design and deploy reliable LLM and predictive analytics pipelines in production.",
  benefits:
    "Comprehensive health insurance, flexible working hours, hybrid-friendly culture, annual learning budget, and performance-based bonuses.",
} as const;

function previewHeroHtml(): string {
  return (
    '<div class="m-pv-hero"><div class="m-pv-tags"><span>' +
    IC.mapPin +
    " " +
    DEMO.workType +
    "</span><span>" +
    IC.sparkles +
    " " +
    DEMO.experience +
    "</span></div>" +
    "<h2>" +
    DEMO.title +
    "</h2><p>" +
    IC.building +
    " " +
    DEMO.company +
    " &nbsp; " +
    IC.mapPin +
    " " +
    DEMO.location +
    "</p></div>"
  );
}

function previewSuccessFeeHtml(): string {
  return (
    '<div class="m-pv-bonus"><div class="m-pv-bonus-ic">' +
    IC.award +
    '</div><div class="m-pv-bonus-body"><span class="m-pv-bonus-lbl">Success Bonus</span>' +
    "<b>" +
    DEMO.successFee +
    "</b><small>one-time, paid to Candidate</small></div>" +
    '<p class="m-pv-bonus-note">Paid after your candidate completes the <b>' +
    DEMO.probationDays +
    "-day probation</b> and converts to a full-time permanent employee.</p></div>"
  );
}

function previewStatsHtml(): string {
  return (
    '<div class="m-pv-stats"><div class="m-pv-stat em"><span>Salary Range</span><b>' +
    DEMO.salary +
    "</b></div>" +
    '<div class="m-pv-stat pu"><span>Department</span><b>' +
    DEMO.department +
    "</b></div>" +
    '<div class="m-pv-stat bl"><span>Industry</span><b>' +
    DEMO.industry +
    "</b></div></div>"
  );
}

function previewSkillsHtml(): string {
  const req = DEMO.requiredSkills
    .map((s) => '<span class="m-sbadge rose">' + s + "</span>")
    .join("");
  const pref = DEMO.preferredSkills
    .map((s) => '<span class="m-sbadge blu">' + s + "</span>")
    .join("");
  return (
    '<div class="m-pv-skills-card"><div class="m-pv-skills-block"><div class="m-pv-skills-lbl rose">Required Skills</div>' +
    '<div class="m-pv-skills-row">' +
    req +
    '</div></div><div class="m-pv-skills-block"><div class="m-pv-skills-lbl pu">Preferred Skills</div>' +
    '<div class="m-pv-skills-row">' +
    pref +
    "</div></div></div>"
  );
}

function previewSectionsHtml(): string {
  const sections = [
    { icon: IC.info, title: "About the Role", body: DEMO.description },
    { icon: IC.clipboard, title: "Requirements", body: DEMO.requirements },
    {
      icon: IC.listChecks,
      title: "Responsibilities",
      body: DEMO.responsibilities,
    },
    { icon: IC.gift, title: "Benefits", body: DEMO.benefits },
  ];
  return (
    '<div class="m-pv-sections">' +
    sections
      .map(
        (s) =>
          '<section class="m-pv-section"><div class="m-pv-section-head">' +
          s.icon +
          "<h3>" +
          s.title +
          '</h3></div><p class="m-pv-section-body">' +
          s.body +
          "</p></section>"
      )
      .join("") +
    "</div>"
  );
}

function previewDrawerBodyHtml(): string {
  return (
    previewHeroHtml() +
    previewSuccessFeeHtml() +
    previewStatsHtml() +
    previewSkillsHtml() +
    previewSectionsHtml()
  );
}

/** Sidebar teaser — unchanged from original; full preview opens in the drawer. */
export function livePreview(): string {
  return (
    '<div class="m-preview-col"><div class="m-preview-box"><div class="m-preview-ic">' +
    IC.eye +
    "</div>" +
    "<h4>Live Preview</h4><p>See exactly how your job post will appear to candidates as you fill it in.</p>" +
    '<button type="button" class="m-preview-btn">' +
    IC.eye +
    " Open Preview</button></div></div>"
  );
}

export function previewDrawerHtml(): string {
  return (
    '<div class="m-pv-overlay" id="mPvOverlay" aria-hidden="true">' +
    '<div class="m-pv-drawer"><div class="m-pv-drawer-head"><span class="m-pv-drawer-title">' +
    IC.eye +
    " Live Preview</span>" +
    '<button type="button" class="m-pv-close" id="mPvClose">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
    "</button></div>" +
    '<div class="m-pv-drawer-body">' +
    previewDrawerBodyHtml() +
    "</div></div></div>"
  );
}
