import { IC } from "../icons";
import { PIPE_DEMO } from "./pipeline-demo";

const PIPELINE_STEPS = [
  {
    key: "applied",
    label: "Applied",
    status: "done",
    date: PIPE_DEMO.appliedAt,
  },
  { key: "in_review", label: "In Review", status: "current" },
  { key: "shortlisted", label: "Shortlisted", status: "pending" },
  {
    key: "interview_scheduled",
    label: "Interview Scheduled",
    status: "pending",
  },
  {
    key: "interview_completed",
    label: "Interview Completed",
    status: "pending",
  },
  { key: "hired", label: "Hired", status: "pending" },
] as const;

const STEP_ICONS: Record<string, string> = {
  in_review: IC.eye,
  shortlisted: IC.thumbsUp,
  interview_scheduled: IC.calendar,
  interview_completed: IC.checkCircle,
  hired: IC.circle,
};

function pipelineStepIcon(key: string, status: string): string {
  if (status === "done") return IC.check;
  return STEP_ICONS[key] ?? IC.circle;
}

function pipelineTrackerHtml(): string {
  const steps = PIPELINE_STEPS.map((s) => {
    const cls =
      "m-cdm-pipe-step m-cdm-pipe-" +
      (s.status === "done"
        ? "done"
        : s.status === "current"
          ? "current"
          : "pending");
    const badge =
      s.status === "current"
        ? '<span class="m-cdm-pipe-badge">Current</span>'
        : s.date
          ? '<span class="m-cdm-pipe-date">' + s.date + "</span>"
          : "";
    return (
      '<div class="' +
      cls +
      '"><div class="m-cdm-pipe-ic">' +
      pipelineStepIcon(s.key, s.status) +
      '</div><span class="m-cdm-pipe-lbl">' +
      s.label +
      "</span>" +
      badge +
      "</div>"
    );
  }).join("");

  return (
    '<div class="m-cdm-pipeline">' +
    '<div class="m-cdm-pipe-head">' +
    '<div class="m-cdm-pipe-head-l">' +
    '<span class="m-cdm-pipe-head-ic">' +
    IC.layers +
    "</span>" +
    "<div><b>Candidate Pipeline</b><span>1 of 6 completed</span></div></div>" +
    '<span class="m-cdm-pipe-pct">17%</span></div>' +
    '<div class="m-cdm-pipe-track"><div class="m-cdm-pipe-line"></div><div class="m-cdm-pipe-steps">' +
    steps +
    "</div></div></div>"
  );
}

function overviewPanelHtml(): string {
  return (
    '<div class="m-cdm-panel on" data-panel="overview">' +
    '<div class="m-cdm-ai">' +
    '<div class="m-cdm-ai-head">' +
    IC.sparkles +
    "<b>AI Summary</b></div>" +
    "<p>" +
    PIPE_DEMO.aiSummary +
    "</p></div></div>"
  );
}

function experiencePanelHtml(): string {
  return (
    '<div class="m-cdm-panel" data-panel="experience">' +
    '<div class="m-cdm-sec">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.briefcase +
    "Experience</p>" +
    '<div class="m-cdm-timeline">' +
    '<div class="m-cdm-timeline-line"></div>' +
    '<div class="m-cdm-timeline-item">' +
    '<span class="m-cdm-timeline-dot m-cdm-timeline-dot-pu"></span>' +
    "<div><b>" +
    PIPE_DEMO.title +
    "</b><span>" +
    PIPE_DEMO.company +
    "</span><em>2021-01 – Present</em></div></div></div></div>" +
    '<div class="m-cdm-sec">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.gradCap +
    "Education</p>" +
    '<div class="m-cdm-card m-cdm-card-sky">' +
    '<span class="m-cdm-card-dot m-cdm-card-dot-sky"></span>' +
    "<div><b>Bachelor of Science — Computer Science</b><span>State University · 2018</span></div></div></div>" +
    '<div class="m-cdm-sec">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.award +
    "Certifications</p>" +
    '<div class="m-cdm-card m-cdm-card-am">' +
    '<span class="m-cdm-card-dot m-cdm-card-dot-am"></span>' +
    "<div><b>AWS Certified Developer</b></div></div></div>" +
    '<div class="m-cdm-sec">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.languages +
    "Languages</p>" +
    '<div class="m-cdm-chips"><span class="m-cdm-chip m-cdm-chip-sky">English</span></div></div></div>'
  );
}

function skillsPanelHtml(): string {
  const chips = PIPE_DEMO.skills
    .map((s) => '<span class="m-cdm-chip">' + s + "</span>")
    .join("");
  return (
    '<div class="m-cdm-panel" data-panel="skills">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.layers +
    "Skills</p>" +
    '<div class="m-cdm-chips">' +
    chips +
    "</div></div>"
  );
}

function projectsPanelHtml(): string {
  return (
    '<div class="m-cdm-panel" data-panel="projects">' +
    '<p class="m-cdm-sec-lbl">' +
    IC.fileText +
    "Projects</p>" +
    '<div class="m-cdm-project">' +
    "<b>API Platform</b>" +
    '<span class="m-cdm-project-role">Lead Developer</span>' +
    "<p>Built a scalable REST API serving 50k daily requests.</p></div></div>"
  );
}

function tabsHtml(skillCount: number): string {
  return (
    '<div class="m-cdm-tabs" role="tablist">' +
    '<button type="button" class="m-cdm-tab on" data-tab="overview" role="tab" aria-selected="true">' +
    IC.sparkles +
    "Overview</button>" +
    '<button type="button" class="m-cdm-tab" data-tab="experience" role="tab" aria-selected="false">' +
    IC.briefcase +
    "Experience</button>" +
    '<button type="button" class="m-cdm-tab" data-tab="skills" role="tab" aria-selected="false">' +
    IC.layers +
    "Skills <em>" +
    skillCount +
    "</em></button>" +
    '<button type="button" class="m-cdm-tab" data-tab="projects" role="tab" aria-selected="false">' +
    IC.fileText +
    "Projects <em>1</em></button></div>"
  );
}

export function candidateDetailModalHtml(): string {
  const skillCount = PIPE_DEMO.skills.length;

  return (
    '<div class="m-cdm-dialog">' +
    '<div class="m-cdm-hero">' +
    '<button type="button" class="m-cdm-x" id="pipeViewClose" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-cdm-hero-row">' +
    '<div class="m-cdm-av">' +
    PIPE_DEMO.anonAvatar +
    "</div>" +
    '<div class="m-cdm-hero-text">' +
    "<h4>" +
    PIPE_DEMO.anonLabel +
    '</h4><span class="m-cdm-stage-pill"><i></i>IN REVIEW</span>' +
    '<div class="m-cdm-role-row">' +
    IC.briefcase +
    "<span>" +
    PIPE_DEMO.title +
    '</span><span class="m-cdm-exp-pill">' +
    PIPE_DEMO.years +
    " Years of Experience</span></div>" +
    '<div class="m-cdm-meta-row">' +
    "<span>" +
    IC.clock +
    "Applied " +
    PIPE_DEMO.appliedAt +
    "</span>" +
    '<span><span class="m-cdm-ref-av">CA</span>Referred by <b>' +
    PIPE_DEMO.connectorName +
    "</b></span>" +
    "<span>" +
    IC.shield +
    "Details hidden</span></div></div></div></div>" +
    '<div class="m-cdm-body">' +
    pipelineTrackerHtml() +
    tabsHtml(skillCount) +
    '<div class="m-cdm-panels">' +
    overviewPanelHtml() +
    experiencePanelHtml() +
    skillsPanelHtml() +
    projectsPanelHtml() +
    "</div></div>" +
    '<div class="m-cdm-foot">' +
    '<button type="button" class="m-cdm-btn m-cdm-reject">' +
    IC.thumbsDown +
    "<span>Reject</span></button>" +
    '<button type="button" class="m-cdm-btn m-cdm-shortlist qsd-hot" id="pipeViewShortlist" data-callout="Click Shortlist" data-co-side="top">' +
    IC.thumbsUp +
    "<span>Shortlist</span></button></div></div>"
  );
}
