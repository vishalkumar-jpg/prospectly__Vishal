import { IC, svgIc } from "../../icons";
import { payoutOptHtml, payoutTypeHtml } from "./payout-helpers";

export function payoutStepHtml(): string {
  const emp = payoutTypeHtml(
    IC.building,
    "Your Employees",
    "People on your company payroll who helped with this hire",
    payoutOptHtml(
      IC.zap,
      "Payable on hire",
      "Release as soon as you mark them hired",
      true
    ) +
      payoutOptHtml(
        IC.clock,
        "Pay after waiting period",
        "Releasable after the waiting period",
        false
      )
  );
  const out = payoutTypeHtml(
    IC.users,
    "Outside Connectors",
    "Anyone outside your company who helped recruit this candidate",
    payoutOptHtml(
      IC.zap,
      "Payable on hire",
      "Release as soon as you mark them hired",
      false
    ) +
      payoutOptHtml(
        IC.clock,
        "Pay after waiting period",
        "Releasable after the waiting period",
        true
      )
  );
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">When do connectors get paid?</h2><p class="m-step-sub">Decide whether connectors become payable as soon as you hire, or only after a waiting period</p></div>' +
    '<div class="m-skill-info">' +
    IC.info +
    " <span>Once published, connector payout settings cannot be edited. The waiting period is counted from the candidate\u2019s hire date.</span></div>" +
    '<div class="m-payout-main"><div class="m-payout-main-head"><b>When do connectors get paid?</b><small>Choose when each type of connector becomes payable after a candidate is hired. You can set them separately.</small></div>' +
    '<div id="payoutEmp" data-grp="emp">' +
    emp +
    "</div>" +
    '<div id="payoutOut" data-grp="out">' +
    out +
    "</div>" +
    '<div class="m-payout-wait" id="payoutWait"><label>Waiting Period</label><div class="inp"><span class="qsd-type" id="payoutDays" data-type="30"></span><span class="days-sfx">Days</span></div>' +
    '<p class="m-payout-err" id="payoutErr">Enter the number of days connectors must wait.</p></div>' +
    '<div class="m-pay-ok" id="payoutSum">' +
    svgIc('<path d="M20 6 9 17l-5-5"/>', 12, 12) +
    " <span>Your <b>employees</b> are payable <b>as soon as you hire</b>, and <b>outside connectors</b> are payable <b>30 days after hire</b>.</span></div></div>" +
    '<div class="m-wiz-foot"><span class="m-btn continue qsd-hot" data-callout="Click Continue" data-co-side="left">Continue</span></div>'
  );
}
