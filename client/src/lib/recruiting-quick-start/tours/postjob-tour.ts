import { IC } from "../icons";
import { shell } from "../builders/shell";
import { wizardShell } from "../builders/wizard-shell";
import { skillsStepHtml } from "../builders/wizard-steps/skills";
import { descriptionStepHtml } from "../builders/wizard-steps/description";
import { assessmentInteractiveHtml } from "../builders/wizard-steps/assessment";
import { budgetStepHtml } from "../builders/wizard-steps/budget";
import { payoutStepHtml } from "../builders/wizard-steps/payout";
import { successStepHtml } from "../builders/wizard-steps/success";
import { paymentStepHtml } from "../builders/wizard-steps/payment";
import { okScreen } from "../builders/ok-screen";
import { svgIc } from "../icons";
import type { Tour } from "../types";

export const postjobTour: Tour = {
  id: "postjob",
  meta: [
    {
      t: "Start from the menu",
      d: "Everything begins at <b>Post a Job</b> in the Recruiting menu. Click the pink button to open the job wizard.",
    },
    {
      t: "Choose how to create your job",
      d: "Three ways: paste a <b>URL</b>, upload a <b>PDF</b>, or build it <b>manually</b>. Whichever you pick, you can edit everything before publishing.",
    },
    {
      t: "Fill the Job Details",
      d: "Company, Job Title, <b>Industry</b>, <b>Department</b>, <b>Experience Level</b>, Work Type and Location — every field marked <b>*</b> is required.",
    },
    {
      t: "Add Skills",
      d: "Add at least <b>1 required</b> skill (preferred is optional). Tip: tap the suggested chips for your department to add them in one click.",
    },
    {
      t: "Write the description",
      d: "Let <b>AI generate</b> a full description, or write the <b>Job Description, Requirements, Responsibilities</b> and <b>Benefits</b> yourself. Tap each section to expand it.",
    },
    {
      t: "Add assessment questions (optional)",
      d: "Follow the pink highlights: open <b>Add Question</b>, pick from the <b>Question Bank</b>, write a <b>fresh</b> question, choose <b>Answer type</b>, then tick <b>Save to bank</b>.",
    },
    {
      t: "Set salary & referral fee",
      d: "Enter the salary range and flat referral fee for this role.<br>No per-candidate charge — the full fee is charged only when you hire.",
    },
    {
      t: "When do connectors get paid?",
      d: "Your employees are payable as soon as you hire, and outside connectors are payable after the waiting period.",
    },
    {
      t: "Success Fees (optional)",
      d: "Optionally offer a <b>one-time bonus</b> to the hired candidate, payable after a probation window. It is shown on the public job page.",
    },
    {
      t: "Save your card — $0 today",
      d: "Stored securely via Stripe — <b>Powered by Stripe · Encrypted · PCI Compliant</b>. You are billed only when you shortlist a candidate.",
    },
    {
      t: "Notify your organization",
      d: "Optionally email members of selected <b>Organizations</b> when the job posts. A job can be notified once — you can also send it later from My Job Posts.",
    },
    {
      t: "Review & Publish",
      d: "One last look. Publishing makes the job live: matching starts, connectors get notified, and it appears on the Marketplace.",
    },
    {
      t: "Job published 🎉",
      d: "Your job is live on the Marketplace. Click <b>Done</b> to finish — next, learn how to notify users about it.",
    },
  ],
  label: "Post Your First Job",
  screens: [
    () => {
      return shell(
        "",
        "Dashboard",
        '<div class="m-h1">Welcome back 👋</div><div class="m-sub">Everything starts from the menu on the left.</div>' +
          '<div class="m-card"><b style="font-size:11px">Ready to hire?</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Post a Job</b> to create your first job post — the pink button shows you where.</div></div>',
        "post-job",
        'Click "Post a Job"'
      );
    },
    () => {
      return wizardShell(
        0,
        '<div class="m-wiz-page-title">Post New Job Requirement</div><div class="m-wiz-page-sub">Choose the method that works best for you</div>' +
          '<div class="m-wiz-q">How would you like to create your job post?</div>' +
          '<div class="m-meth-lg">' +
          '<div class="m-mcard-lg"><div class="ico">' +
          IC.link +
          "</div><h5>Extract through URL</h5><p>Paste any public job posting URL and our AI will extract all details automatically</p></div>" +
          '<div class="m-mcard-lg"><div class="ico">' +
          IC.upload +
          "</div><h5>Upload PDF</h5><p>Upload a job description file (PDF) and our AI will extract the details for you</p></div>" +
          '<div class="m-mcard-lg sel qsd-hot" data-callout="Select &quot;Create Manually&quot;" data-co-side="left"><div class="ico ico-on">' +
          IC.pen +
          '</div><h5>Create Manually</h5><p>Fill in all job details step by step with AI-assisted description generation</p><div class="chk">' +
          svgIc('<path d="M20 6 9 17l-5-5"/>', 12, 12) +
          "</div></div>" +
          "</div>"
      );
    },
    () => {
      return wizardShell(
        1,
        '<div class="m-step-head"><h2 class="m-step-h2">Job Details</h2><p class="m-step-sub">Define the position you\u2019re hiring for</p></div>' +
          '<div class="m-fld"><label>' +
          IC.building +
          ' Company Name <span class="req">*</span></label><div class="inp qsd-type" data-type="Seno Technolab"></div><p class="hint">5\u2013255 characters</p></div>' +
          '<div class="m-fld"><label>' +
          IC.briefcase +
          ' Job Title <span class="req">*</span></label><div class="inp qsd-type" data-type="Principal AI Engineer"></div></div>' +
          '<div class="m-grid2"><div class="m-fld"><label>Industry <span class="req">*</span></label><div class="inp qsd-type" data-type="Technology"></div></div>' +
          '<div class="m-fld"><label>Department <span class="req">*</span></label><div class="inp qsd-type" data-type="Engineering"></div></div></div>' +
          '<div class="m-grid2"><div class="m-fld"><label>' +
          IC.target +
          ' Experience Level <span class="req">*</span></label><div class="inp qsd-type" data-type="Lead / Staff (8-12 years)"></div></div>' +
          '<div class="m-fld"><label>' +
          IC.globe +
          ' Work Type <span class="req">*</span></label><div class="inp qsd-type" data-type="Hybrid"></div></div></div>' +
          '<div class="m-fld"><label>' +
          IC.mapPin +
          ' Location <span class="req">*</span></label><div class="inp qsd-type" data-type="Ahmedabad, Gujarat, India"></div></div>' +
          '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left" data-co-valign="center">Continue</span></div>'
      );
    },
    () => {
      return wizardShell(2, skillsStepHtml());
    },
    () => {
      return wizardShell(3, descriptionStepHtml());
    },
    () => {
      return wizardShell(4, assessmentInteractiveHtml());
    },
    () => {
      return wizardShell(5, budgetStepHtml());
    },
    () => {
      return wizardShell(6, payoutStepHtml());
    },
    () => {
      return wizardShell(7, successStepHtml());
    },
    () => {
      return wizardShell(8, paymentStepHtml());
    },
    () => {
      return wizardShell(
        9,
        '<div class="m-step-head"><h2 class="m-step-h2">Notify Organization</h2><p class="m-step-sub">Optionally email members of selected Organization as soon as this job is posted</p></div>' +
          '<div style="font-size:8px;color:#7A5C9E;background:rgba(159,129,189,.1);border-radius:7px;padding:7px 9px;margin-top:8px">The notification is sent in the background after the job is posted. A job can only be notified once — you can also send it later from My Job Posts.</div>' +
          '<div class="m-card" style="margin-top:9px;padding:10px 12px"><div style="font-size:9.5px;font-weight:800;display:flex;align-items:center;gap:5px">✉️ Job Post Notification</div>' +
          '<div class="m-row" style="gap:7px;margin-top:7px;align-items:flex-start"><span style="width:14px;height:14px;border-radius:4px;background:#9F81BD;color:#fff;display:grid;place-items:center;font-size:9px;font-weight:800;flex-shrink:0">✓</span><span style="font-size:9px;color:#3D4354">Notify users about this job</span></div>' +
          '<div class="m-field"><label>Organizations *</label><div class="in">Office Beacon LLC, Vistage ▾</div></div></div>' +
          '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left" data-co-valign="center">Continue</span></div>'
      );
    },
    () => {
      return wizardShell(
        10,
        '<div class="m-step-head"><h2 class="m-step-h2">Review &amp; Confirm</h2><p class="m-step-sub">Review your job posting before publishing</p></div>' +
          '<div class="m-card" style="margin-top:9px"><b style="font-size:12px">Principal AI Engineer</b><div style="font-size:9.5px;color:#6B7280">Seno Technolab · Ahmedabad · Hybrid · Technology / Engineering</div>' +
          '<div class="m-row" style="margin-top:7px;gap:6px;flex-wrap:wrap"><span class="m-badge pu">$10–$50 /hr</span><span class="m-badge am">$206.35 / candidate</span><span class="m-badge em">Success Fee $5,000 · 90D</span><span class="m-badge pu">2 assessment Qs</span></div>' +
          '<div style="font-size:9.5px;color:#6B7280;margin-top:9px"><b style="color:#0B1020">What Happens Next?</b><br>① Candidate Matching Begins → ② Connectors Get Notified → ③ Job Goes Live on the Marketplace.</div>' +
          '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Publish Job Post 🎉" data-co-side="left">✓ Publish Job Post</span></div></div>'
      );
    },
    () => {
      return okScreen(
        "Published! Your job is live 🎉",
        "Candidate matching has begun, connectors are being notified, and your job is now visible on the Job Marketplace."
      );
    },
  ],
};
