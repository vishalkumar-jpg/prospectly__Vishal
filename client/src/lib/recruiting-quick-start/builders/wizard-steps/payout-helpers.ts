export function payoutOptHtml(
  icon: string,
  label: string,
  sub: string,
  sel: boolean
): string {
  return (
    '<button type="button" class="m-payout-opt' +
    (sel ? " on" : "") +
    '"><span class="m-po-top">' +
    icon +
    " " +
    label +
    '<span class="m-po-radio"></span></span><span class="m-po-sub">' +
    sub +
    "</span></button>"
  );
}

export function payoutTypeHtml(
  icon: string,
  title: string,
  desc: string,
  opts: string
): string {
  return (
    '<div class="m-payout-type"><div class="m-payout-type-head"><div class="m-payout-type-ic">' +
    icon +
    "</div><div><b>" +
    title +
    "</b><small>" +
    desc +
    '</small></div></div><div class="m-payout-opts">' +
    opts +
    "</div></div>"
  );
}

export function payoutSummaryText(
  empHire: boolean,
  outHire: boolean,
  days: number
): string {
  const dayLabel = days === 1 ? "day" : "days";
  const emp = empHire
    ? "as soon as you hire"
    : `${days} ${dayLabel} after hire`;
  const out = outHire
    ? "as soon as you hire"
    : `${days} ${dayLabel} after hire`;
  if (empHire === outHire) {
    return "<b>All connectors</b> are payable <b>" + emp + "</b>.";
  }
  return (
    "Your <b>employees</b> are payable <b>" +
    emp +
    "</b>, and <b>outside connectors</b> are payable <b>" +
    out +
    "</b>."
  );
}
