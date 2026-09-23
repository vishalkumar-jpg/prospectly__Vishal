import { IC } from "../../icons";

export function successStepHtml(): string {
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">Success Fees</h2><p class="m-step-sub">Optionally offer a one-time bonus to the hired candidate, payable after a probation window</p></div>' +
    '<div class="m-skill-info">' +
    IC.info +
    " <span>Once published, success fee details cannot be edited. Please review carefully before continuing.</span></div>" +
    '<div class="m-success-card"><div class="m-success-head">' +
    IC.award +
    " Success Fee</div>" +
    '<label class="m-success-chk" id="successChk"><span class="m-chk-box"></span> Do you want to apply Success Fees to candidates?</label>' +
    '<div class="m-success-fields" id="successFields" style="display:none">' +
    '<div class="m-grid2"><div class="m-fld"><label>Success Fee Amount <span class="req">*</span></label><div class="inp qsd-type" id="successAmt" data-type="$5,000"></div></div>' +
    '<div class="m-fld"><label>Probation Period</label><div class="inp qsd-type" id="successProb" data-type="90"></div><p class="hint">Days</p></div></div></div>' +
    '<p class="m-success-note">Shown on the public job page so candidates see the bonus before applying.</p></div>' +
    '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left">Continue</span></div>'
  );
}
