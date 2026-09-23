import { IC } from "../../icons";

export function budgetStepHtml(): string {
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">Budget &amp; Pricing Model</h2><p class="m-step-sub">Choose how you want to pay for this hire, then set the salary range</p></div>' +
    '<div class="m-skill-info">' +
    IC.info +
    " <span>Once published, the salary range and flat referral fee cannot be edited. Please review these details carefully before continuing.</span></div>" +
    '<div class="m-budget-card">' +
    '<div class="m-budget-card-head">' +
    IC.banknote +
    ' Salary Range <span class="m-opt">(Optional)</span></div>' +
    '<div class="m-budget-card-body">' +
    '<div class="m-budget-salary-grid">' +
    '<div class="m-fld"><label>Currency</label><div class="inp m-currency-select">USD \u25be</div></div>' +
    '<div class="m-fld"><label>Minimum</label><div class="m-currency-input"><span class="m-currency-prefix">$</span><div class="inp qsd-type" id="salMin" data-type="80,000"></div></div></div>' +
    '<div class="m-fld"><label>Maximum</label><div class="m-currency-input"><span class="m-currency-prefix">$</span><div class="inp qsd-type" id="salMax" data-type="120,000"></div></div></div>' +
    "</div>" +
    '<div class="m-fld"><label>Frequency</label><div class="inp">Per Year \u25be</div></div>' +
    "</div></div>" +
    '<div class="m-budget-card m-budget-fee-card">' +
    '<div class="m-budget-card-head">' +
    IC.coins +
    " Flat Referral Fee</div>" +
    '<div class="m-budget-card-body">' +
    '<div class="m-budget-flat-inner">' +
    '<div class="m-budget-flat-row"><span class="m-budget-flat-lbl">Flat fee per hire <span class="req">*</span></span>' +
    '<div class="m-currency-input m-flat-fee-inp"><span class="m-currency-prefix">$</span><div class="inp qsd-type" id="flatFee" data-type="750"></div></div></div>' +
    '<p class="m-budget-flat-helper">Set the total referral fee paid when you hire a candidate. Enter it manually.</p>' +
    '<div class="m-fee" id="flatFeeTbl"><div><span>Stripe Processing Fee (2.9% + $0.30)</span><span>$22.05</span></div>' +
    '<div><span>Charged on First Shortlist (5%)</span><span class="em">$38.62</span></div></div>' +
    '<p class="m-budget-hint">No per-candidate charge \u2014 shortlist as many candidates as you like.<br>A small fee is charged when you shortlist your first candidate; the full flat referral fee is charged only when you hire.</p>' +
    "</div></div></div>" +
    '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left">Continue</span></div>'
  );
}
