import { IC } from "../../icons";

export function paymentStepHtml(): string {
  return (
    '<div class="m-step-head"><h2 class="m-step-h2">Secure Payment Setup</h2><p class="m-step-sub">Add a payment method to publish your job post</p></div>' +
    '<div class="m-success-card"><div class="m-success-head">' +
    IC.creditCard +
    " Credit Card Details</div>" +
    '<div class="m-fld"><label>Card Number</label><div class="inp qsd-type" id="cardNum" data-type="XXXX XXXX XXXX 4242"></div></div>' +
    '<div class="m-grid2"><div class="m-fld"><label>Expiry Date</label><div class="inp qsd-type" id="cardExp" data-type="12 / 28"></div></div>' +
    '<div class="m-fld"><label>Security Code</label><div class="inp qsd-type" id="cardCvc" data-type="123"></div></div></div>' +
    '<button type="button" class="m-btn continue m-pay-save qsd-hot" id="paySaveBtn" data-callout="Save Payment Method" data-co-side="top" data-co-action="save">' +
    IC.creditCard +
    " Save Payment Method</button>" +
    '<div class="m-pay-trust"><span>\ud83d\udee1 Powered by Stripe</span><span>\ud83d\udd12 Encrypted</span><span>\u2713 PCI Compliant</span></div></div>' +
    '<div class="m-wiz-foot m-pay-foot"><span class="m-btn continue m-pay-continue locked" id="payContinue" data-callout="Click Continue" data-co-side="left">Continue</span></div>'
  );
}
