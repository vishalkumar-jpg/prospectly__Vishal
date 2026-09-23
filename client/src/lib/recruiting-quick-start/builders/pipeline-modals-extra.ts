import { IC } from "../icons";
import { PIPE_DEMO } from "./pipeline-demo";

function modalShell(body: string, foot: string): string {
  return '<div class="m-pm-dialog m-pm-dialog-hire">' + body + foot + "</div>";
}

function hireHero(): string {
  return (
    '<div class="m-pm-hero m-pm-hero-brand">' +
    '<button type="button" class="m-pm-x m-pm-x-light" id="pipeHireClose" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-pm-hero-row">' +
    '<div class="m-pm-hero-ic m-pm-hero-ic-brand">' +
    IC.userCheck +
    "</div>" +
    "<div><h4>Move " +
    PIPE_DEMO.refLabel +
    " to Hired</h4>" +
    "<p>Confirm the hire date and classify each connector to complete the move.</p></div></div></div>"
  );
}

function hireFoot(): string {
  return (
    '<div class="m-pm-foot m-pm-foot-sticky">' +
    '<div class="m-pm-foot-actions">' +
    '<button type="button" class="m-pm-cancel">Cancel</button>' +
    '<button type="button" class="m-pm-confirm locked" id="pipeHireConfirm" disabled>' +
    IC.check +
    "<span>Pay $" +
    PIPE_DEMO.hireAmount +
    " &amp; Move to Hired</span></button></div></div>"
  );
}

export function moveToHiredModalHtml(): string {
  const body =
    hireHero() +
    '<div class="m-pm-body m-pm-body-scroll">' +
    '<div class="m-pm-pay-box m-pm-pay-box-green">' +
    '<div class="m-pm-pay-head">' +
    IC.dollar +
    "<b>Payment</b></div>" +
    "<p>Moving <b>" +
    PIPE_DEMO.refLabel +
    '</b> to Hired will charge <b class="m-pm-amt">$' +
    PIPE_DEMO.hireAmount +
    "</b> (the referral fee) to your card.</p></div>" +
    '<div class="m-pm-field"><label>Hire date</label>' +
    '<input type="date" class="m-pm-date" id="hireDateInput" value="" /></div>' +
    '<p class="m-pm-hint">The probation window starts from this date.</p>' +
    '<div class="m-pm-field"><label>Classify each connector</label>' +
    '<p class="m-pm-hint">Internal = on your payroll. External = anyone else.</p>' +
    '<div class="m-pm-conn-card" id="hireConnCard">' +
    '<div class="m-pm-conn-top">' +
    '<div class="m-pm-conn-av">' +
    PIPE_DEMO.connectorName.charAt(0) +
    "</div>" +
    "<div><b>" +
    PIPE_DEMO.connectorName +
    '</b><span class="m-pm-conn-primary">PRIMARY</span>' +
    "<p>" +
    PIPE_DEMO.connectorRole +
    " · " +
    PIPE_DEMO.connectorCompany +
    "</p>" +
    '<span class="m-pm-conn-li">' +
    IC.linkedin +
    " LinkedIn</span></div></div>" +
    '<div class="m-pm-conn-class">' +
    "<span>Classification</span>" +
    '<div class="m-pm-seg"><span id="hireSegInternal">Internal</span><span id="hireSegExternal">External</span></div>' +
    '<div class="m-pm-active-emp" id="hireActiveCheck">' +
    '<input type="checkbox" class="m-pm-radix-check" id="hireActiveInput" aria-label="Active employee" />' +
    '<label class="m-pm-active-emp-label" for="hireActiveInput">Active employee</label></div></div></div></div></div>';

  return modalShell(body, hireFoot());
}

export { candidateDetailModalHtml } from "./candidate-detail-modal";
