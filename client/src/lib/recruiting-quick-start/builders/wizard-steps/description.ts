import { IC } from "../../icons";

export function descriptionStepHtml(): string {
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">Job Description</h2><p class="m-step-sub">Generate or write the job description</p></div>' +
    '<div class="m-ai-card"><div class="m-ai-ic">' +
    IC.wand +
    "</div><h3>Generate with AI</h3><p>AI will create a complete job description based on your selections</p>" +
    '<span class="m-btn pri m-ai-btn">' +
    IC.sparkles +
    " Generate Description</span></div>" +
    '<div class="m-desc-acc" id="descAcc">' +
    '<div class="m-desc-item open" data-acc="0"><button type="button" class="m-desc-head">' +
    IC.fileText +
    ' <span><b>Job Description</b> <small>Overview of the role</small></span><span class="m-desc-req">required</span>' +
    IC.chevDown +
    '</button><div class="m-desc-body"><div class="m-rich-bar"><span>B</span><span>I</span><span>\u2022</span><span>1.</span></div>' +
    '<div class="m-desc-area qsd-type" data-type="We are seeking a Principal AI Engineer to lead architecture and deployment of enterprise AI solutions across LLMs and predictive analytics."></div>' +
    '<div class="m-desc-count">0 / 5,000</div></div></div>' +
    '<div class="m-desc-item" data-acc="1"><button type="button" class="m-desc-head">' +
    IC.clipboard +
    ' <span><b>Requirements</b> <small>Must-have qualifications</small></span><span class="m-desc-req">required</span>' +
    IC.chevDown +
    '</button><div class="m-desc-body"><div class="m-desc-area qsd-type" data-type="8+ years in software engineering, strong Python and distributed systems experience."></div></div></div>' +
    '<div class="m-desc-item" data-acc="2"><button type="button" class="m-desc-head">' +
    IC.listChecks +
    " <span><b>Responsibilities</b> <small>Day-to-day duties</small></span>" +
    IC.chevDown +
    '</button><div class="m-desc-body"><div class="m-desc-area qsd-type" data-type="Lead AI architecture, mentor engineers, and ship production ML systems."></div></div></div>' +
    '<div class="m-desc-item" data-acc="3"><button type="button" class="m-desc-head">' +
    IC.gift +
    " <span><b>Benefits &amp; Perks</b> <small>What you offer</small></span>" +
    IC.chevDown +
    '</button><div class="m-desc-body"><div class="m-desc-area qsd-type" data-type="Health insurance, flexible hours, remote-friendly culture, learning budget."></div></div></div></div>' +
    '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left">Continue</span></div>'
  );
}
