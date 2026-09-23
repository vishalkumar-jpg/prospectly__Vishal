import { IC } from "../icons";

function skillTag(label: string, tone: "match" | "miss"): string {
  return (
    '<span class="m-ma-skill m-ma-skill-' + tone + '">' + label + "</span>"
  );
}

function continueFooter(): string {
  return (
    '<div class="m-wiz-foot m-tour-foot">' +
    '<span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="top">Continue →</span>' +
    "</div>"
  );
}

function appCard(opts: {
  title: string;
  company: string;
  location: string;
  workType: string;
  level: string;
  status: string;
  statusTone: "bl" | "em" | "pu" | "am";
  desc: string;
  interview?: string;
  joinBtn?: boolean;
  matched?: string[];
  missing?: string[];
  matchScore?: string;
  salary: string;
  applied: string;
  updated: string;
  timeline: string[];
  hotDetails?: boolean;
}): string {
  const detailsAttrs = opts.hotDetails
    ? ' class="m-ma-details qsd-hot" data-callout="Click Details" data-co-side="left"'
    : ' class="m-ma-details"';
  const timeline = opts.timeline
    .map(
      (t, i) =>
        '<li class="' +
        (i === opts.timeline.length - 1 ? "on" : "") +
        '"><span class="m-ma-tl-dot"></span><div><p>' +
        t +
        "</p></div></li>"
    )
    .join("");

  return (
    '<article class="m-ma-card">' +
    '<div class="m-ma-card-inner">' +
    '<div class="m-ma-card-body">' +
    '<div class="m-ma-card-top">' +
    '<div class="m-ma-card-title-row">' +
    "<h3>" +
    opts.title +
    '</h3><span class="m-ma-status m-ma-status-' +
    opts.statusTone +
    '">' +
    opts.status +
    "</span></div>" +
    "<button" +
    detailsAttrs +
    ' type="button">' +
    IC.fileText +
    "<span>Details</span></button></div>" +
    '<div class="m-ma-meta"><span>' +
    IC.building +
    opts.company +
    "</span><span>" +
    IC.mapPin +
    opts.location +
    '</span><span class="m-ma-pill">' +
    opts.workType +
    '</span><span class="m-ma-pill">' +
    opts.level +
    "</span></div>" +
    '<p class="m-ma-desc">' +
    opts.desc +
    "</p>" +
    (opts.interview
      ? '<div class="m-ma-interview">' +
        IC.calendar +
        "<span>" +
        opts.interview +
        "</span></div>"
      : "") +
    (opts.joinBtn
      ? '<button type="button" class="m-ma-join">Join meeting</button>'
      : "") +
    '<div class="m-ma-eval">' +
    '<div class="m-ma-eval-head"><b>Candidate Evaluation</b>' +
    (opts.matchScore
      ? '<span class="m-ma-match">' + opts.matchScore + " Match</span>"
      : "") +
    "</div>" +
    (opts.matched
      ? '<div class="m-ma-skills"><span class="m-ma-skills-lbl">Matched Skills</span>' +
        opts.matched.map((s) => skillTag(s, "match")).join("") +
        "</div>"
      : "") +
    (opts.missing
      ? '<div class="m-ma-skills"><span class="m-ma-skills-lbl m-ma-skills-miss">Missing Skills</span>' +
        opts.missing.map((s) => skillTag(s, "miss")).join("") +
        "</div>"
      : "") +
    "</div>" +
    '<div class="m-ma-foot"><span>Salary Range: ' +
    opts.salary +
    "</span><span>Applied " +
    opts.applied +
    "</span><span>Last updated " +
    opts.updated +
    "</span></div></div>" +
    '<div class="m-ma-timeline-col"><ul class="m-ma-timeline">' +
    timeline +
    "</ul></div></div></article>"
  );
}

const DEMO_CARDS = [
  {
    title: "Senior Software Engineer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    workType: "Hybrid",
    level: "Senior",
    status: "Interview Scheduled",
    statusTone: "bl" as const,
    desc: "Build scalable backend systems for our core platform.",
    interview: "Interview scheduled at 28 May 2026, 8:30 PM · Video Interview",
    joinBtn: true,
    matchScore: "92%",
    matched: ["TypeScript", "React", "Node.js"],
    missing: ["Kubernetes"],
    salary: "$150,000 – $190,000 / year",
    applied: "10 May 2026, 1:30 PM",
    updated: "22 May 2026, 7:30 PM",
    timeline: [
      "You have successfully applied for this job. · 10 May 2026",
      "Resume under review · 12 May 2026",
      "We've invited you to schedule an interview… · 18 May 2026",
      "Interview scheduled for May 28 · 22 May 2026",
    ],
  },
  {
    title: "Insurance VA",
    company: "SecureLife Agency",
    location: "Remote",
    workType: "Remote",
    level: "Mid-Level",
    status: "Offer Received",
    statusTone: "em" as const,
    desc: "Support insurance clients with policy inquiries and renewals.",
    matchScore: "88%",
    matched: ["Customer Service", "Insurance"],
    salary: "$45,000 – $55,000 / year",
    applied: "5 May 2026, 1:30 PM",
    updated: "24 May 2026, 9:00 AM",
    timeline: [
      "Application submitted · 5 May 2026",
      "Interview completed · 15 May 2026",
      "Offer received · 24 May 2026",
    ],
  },
  {
    title: "Product Manager",
    company: "InnovateLabs",
    location: "New York, NY",
    workType: "Onsite",
    level: "Senior",
    status: "Under Review",
    statusTone: "pu" as const,
    desc: "Lead product strategy for our B2B SaaS platform.",
    matchScore: "76%",
    matched: ["Product Strategy", "Agile"],
    missing: ["B2B SaaS"],
    salary: "$130,000 – $160,000 / year",
    applied: "20 May 2026, 12:00 PM",
    updated: "21 May 2026, 10:00 AM",
    timeline: [
      "Application submitted · 20 May 2026",
      "Under review · 21 May 2026",
    ],
  },
  {
    title: "Frontend Developer",
    company: "WebCraft Studio",
    location: "Remote",
    workType: "Remote",
    level: "Mid-Level",
    status: "Processing",
    statusTone: "am" as const,
    desc: "Build responsive web applications with React and TypeScript.",
    salary: "$95,000 – $120,000 / year",
    applied: "25 May 2026, 4:00 PM",
    updated: "25 May 2026, 4:00 PM",
    timeline: [
      "Application submitted · 25 May 2026",
      "Processing your resume · 25 May 2026",
    ],
  },
];

export function myApplicationsHtml(opts?: { hotDetails?: boolean }): string {
  const cards = DEMO_CARDS.map((card, i) =>
    appCard({
      ...card,
      hotDetails: opts?.hotDetails && i === 0,
    })
  ).join("");

  return (
    '<div class="m-ma-page">' +
    '<div class="m-ma-head"><h1 class="m-ma-title">My Applications — track your applications &amp; interviews.</h1></div>' +
    '<div class="m-ma-list">' +
    cards +
    "</div></div>"
  );
}

export function myApplicationsWithDrawer(opts?: {
  showContinue?: boolean;
}): string {
  return (
    '<div class="m-ma-scene">' +
    '<div class="m-ma-scene-body">' +
    '<div class="m-ma-page m-ma-page-behind">' +
    '<div class="m-ma-head"><h1 class="m-ma-title">My Applications — track your applications &amp; interviews.</h1></div>' +
    '<div class="m-ma-list">' +
    appCard({ ...DEMO_CARDS[0], hotDetails: false }) +
    appCard({ ...DEMO_CARDS[1], hotDetails: false }) +
    "</div></div>" +
    '<div class="m-ma-drawer">' +
    '<div class="m-ma-drawer-scroll">' +
    '<div class="m-ma-drawer-hero">' +
    '<div class="m-ma-drawer-tags"><span>Hybrid</span><span>Senior</span></div>' +
    "<h2>Senior Software Engineer</h2>" +
    '<div class="m-ma-drawer-co">' +
    IC.building +
    "TechCorp Inc. " +
    IC.mapPin +
    "San Francisco, CA</div></div>" +
    '<div class="m-ma-drawer-grid">' +
    '<div class="m-ma-drawer-stat payout"><span>Connector Referral Payout</span><b>$14,000</b></div>' +
    '<div class="m-ma-drawer-stat salary"><span>Salary Range</span><b>$150,000 – $190,000 / Year</b></div>' +
    '<div class="m-ma-drawer-stat"><span>Department</span><b>Engineering</b></div>' +
    '<div class="m-ma-drawer-stat"><span>Industry</span><b>Technology</b></div></div>' +
    '<div class="m-ma-drawer-section"><h4>Required Skills</h4><div class="m-ma-drawer-skills">' +
    ["TypeScript", "React", "Node.js", "PostgreSQL"]
      .map((s) => skillTag(s, "match"))
      .join("") +
    "</div></div>" +
    '<div class="m-ma-drawer-section"><h4>Preferred Skills</h4><div class="m-ma-drawer-skills pref">' +
    ["Kubernetes", "AWS", "GraphQL"]
      .map((s) => '<span class="m-ma-skill m-ma-skill-pref">' + s + "</span>")
      .join("") +
    "</div></div>" +
    '<div class="m-ma-drawer-section"><h4>About the Role</h4><p>Build scalable backend systems for our core platform.</p></div>' +
    '<div class="m-ma-drawer-section"><h4>Requirements</h4><p>5+ years building production web apps. Strong TypeScript, React, and Node.js. Experience with REST APIs and relational databases.</p></div>' +
    '<div class="m-ma-drawer-section"><h4>Responsibilities</h4><p>Design and ship backend services, collaborate with product and design, and own features end-to-end.</p></div>' +
    '<div class="m-ma-drawer-section"><h4>Benefits</h4><p>Health, dental, and vision · 401(k) match · Flexible PTO · Hybrid schedule (3 days in office)</p></div>' +
    "</div></div></div>" +
    (opts?.showContinue ? continueFooter() : "") +
    "</div>"
  );
}
