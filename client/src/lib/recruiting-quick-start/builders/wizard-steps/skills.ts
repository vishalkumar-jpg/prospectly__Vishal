import { IC } from "../../icons";

export function skillsStepHtml(): string {
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">Required &amp; Preferred Skills</h2><p class="m-step-sub">Add at least 1 required skill to continue</p></div>' +
    '<div class="m-skill-info">' +
    IC.info +
    " <span>Once published, the required and preferred skills cannot be edited. Make sure they accurately reflect the role before continuing.</span></div>" +
    '<div class="m-skill-card m-skill-req"><div class="m-skill-head"><span class="m-skill-title">' +
    IC.starGrn +
    ' Required Skills <span class="req">*</span></span><span class="m-skill-count" id="reqCount">0 / 50</span></div>' +
    '<div class="m-skill-input-row"><input class="m-skill-inp" id="reqSkillInp" placeholder="Type a skill and press Enter..." readonly>' +
    '<button type="button" class="m-skill-add m-skill-add-pri" id="reqSkillAdd">' +
    IC.plus +
    "</button></div>" +
    '<div class="m-skill-badges" id="reqSkillBadges"><span class="m-skill-empty">No required skills added yet</span></div></div>' +
    '<div class="m-skill-card m-skill-pref"><div class="m-skill-head"><span class="m-skill-title">' +
    IC.sparklesBl +
    ' Preferred Skills</span><span class="m-skill-count" id="prefCount">0 / 50</span></div>' +
    '<div class="m-skill-input-row"><input class="m-skill-inp" id="prefSkillInp" placeholder="Type a skill and press Enter..." readonly>' +
    '<button type="button" class="m-skill-add m-skill-add-blu" id="prefSkillAdd">' +
    IC.plus +
    "</button></div>" +
    '<div class="m-skill-badges" id="prefSkillBadges"><span class="m-skill-empty">No preferred skills added yet</span></div></div>' +
    '<div class="m-skill-suggest"><p>Suggested for Engineering \u2014 click to add as required or preferred</p>' +
    '<div class="m-suggest-row"><span class="m-suggest-chip"><span class="sg-l">' +
    IC.starGrn +
    ' Docker</span><span class="sg-r">' +
    IC.sparklesBl +
    "</span></span>" +
    '<span class="m-suggest-chip"><span class="sg-l">' +
    IC.starGrn +
    ' Kubernetes</span><span class="sg-r">' +
    IC.sparklesBl +
    "</span></span></div></div>" +
    '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left" data-co-valign="center">Continue</span></div>'
  );
}
