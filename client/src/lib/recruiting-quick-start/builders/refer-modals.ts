import { IC } from "../icons";
import { jobMarketplaceHtml } from "./job-marketplace";
import { REFER_DEMO } from "./refer-demo";

function uploadModalBody(filled: boolean): string {
  return (
    '<div class="m-ref-dialog">' +
    '<div class="m-ref-hero">' +
    '<button type="button" class="m-ref-x" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-ref-hero-row">' +
    '<div class="m-ref-hero-ic">' +
    IC.upload +
    "</div>" +
    '<div class="m-ref-hero-text">' +
    "<h4>Upload Resumes</h4>" +
    "<p>" +
    IC.building +
    "<span>" +
    REFER_DEMO.jobTitle +
    " @ " +
    REFER_DEMO.jobCompany +
    "</span></p></div></div></div>" +
    '<div class="m-ref-body">' +
    '<div class="m-ref-drop" id="refDropZone">' +
    '<div class="m-ref-drop-icon-wrap">' +
    IC.upload +
    "</div>" +
    '<p class="m-ref-drop-title">Drag &amp; drop resumes or click to browse</p>' +
    '<p class="m-ref-drop-hint">PDF only, max 10MB each, up to 10 files</p></div>' +
    '<div class="m-ref-file-card' +
    (filled ? "" : " m-ref-hidden") +
    '" id="refFileList">' +
    '<div class="m-ref-file-row">' +
    IC.fileText +
    "<span>resume.pdf</span>" +
    IC.checkCircle +
    '<button type="button" class="m-ref-file-remove" aria-label="Remove">' +
    IC.x +
    "</button></div>" +
    '<div class="m-ref-email-field' +
    (filled ? "" : " m-ref-hidden") +
    '" id="refEmailField">' +
    '<label>Candidate email <span class="m-ref-req">*</span></label>' +
    '<div class="m-ref-email-in qsd-type" id="refEmailIn" data-type="' +
    REFER_DEMO.uploadEmail +
    '"></div></div></div>' +
    '<div class="m-ref-consent' +
    (filled ? " checked" : "") +
    '" id="refConsentBox">' +
    '<span class="m-ref-checkbox" id="refConsentCheck"></span>' +
    "<p>I confirm I have permission to share each candidate's information and understand they will be contacted for consent before any introduction is made.</p></div></div>" +
    '<div class="m-ref-foot">' +
    '<button type="button" class="m-ref-cancel">Cancel</button>' +
    '<button type="button" class="m-ref-submit locked" id="refUploadBtn" disabled>' +
    IC.upload +
    '<span id="refUploadLabel">Upload Resume</span></button></div></div>'
  );
}

export function uploadResumeModalHtml(filled = false): string {
  return uploadModalBody(filled);
}

export function marketplaceWithUploadModal(): string {
  return (
    '<div class="m-pm-scene">' +
    '<div class="m-pm-backdrop">' +
    jobMarketplaceHtml({ backdrop: true, hotRefer: true }) +
    "</div>" +
    '<div class="m-pm-overlay m-ref-overlay">' +
    uploadResumeModalHtml(false) +
    "</div></div>"
  );
}

function consentAlertDialogHtml(): string {
  return (
    '<div class="m-rc-consent-dialog">' +
    '<div class="m-rc-consent-head">' +
    "<h4>Send Consent Email</h4>" +
    "<p>Send a consent email to <b>" +
    REFER_DEMO.candidateName +
    '</b> for "<b>' +
    REFER_DEMO.jobTitle +
    '</b>"? They will be able to review the job details and accept or decline.</p></div>' +
    '<div class="m-rc-consent-foot">' +
    '<button type="button" class="m-rc-consent-cancel">Cancel</button>' +
    '<button type="button" class="m-rc-consent-send qsd-hot" id="refConsentSendBtn" data-callout="Send Consent" data-co-side="top">Send Consent</button></div></div>'
  );
}

export function inboxWithConsentModal(inboxHtml: string): string {
  return (
    '<div class="m-rc-scene">' +
    '<div class="m-rc-backdrop">' +
    inboxHtml +
    "</div>" +
    '<div class="m-rc-consent-overlay">' +
    consentAlertDialogHtml() +
    "</div></div>"
  );
}
