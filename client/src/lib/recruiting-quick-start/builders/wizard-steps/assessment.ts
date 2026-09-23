import { IC } from "../../icons";

export const AQ_BANK_Q =
  "Are you authorized to work in this country without sponsorship?";
export const AQ_WRITE_Q =
  "Do you have 3+ years experience with LLMs or production ML systems?";

function aqTabs(active: "bank" | "write"): string {
  const bankOn = active === "bank";
  const writeOn = active === "write";
  return (
    '<div class="m-aq-tabs">' +
    '<span class="m-aq-tab' +
    (writeOn ? " on" : "") +
    '" id="aqTabWrite">' +
    IC.pen +
    " Write New</span>" +
    '<span class="m-aq-tab' +
    (bankOn ? " on" : "") +
    '" id="aqTabBank">' +
    IC.clipboardList +
    " From Question Bank</span></div>"
  );
}

function bankModalBody(): string {
  return (
    '<div class="m-aq-dialog" id="aqBankDialog">' +
    '<div class="m-aq-dialog-head">' +
    '<div class="m-aq-dialog-title">' +
    IC.clipboardList +
    " <span>Add Question</span></div>" +
    '<p class="m-aq-dialog-sub">Candidates answer with Yes or No while applying.</p></div>' +
    aqTabs("bank") +
    '<div class="m-aq-search">Search your questions...</div>' +
    '<div class="m-aq-qlist">' +
    '<div class="m-aq-qrow" id="aqBankRow1" data-callout="Select this question" data-co-side="top">' +
    '<span class="m-aq-ck" id="aqBankCk1"></span><span>' +
    AQ_BANK_Q +
    "</span></div>" +
    '<div class="m-aq-qrow"><span class="m-aq-ck"></span><span>Are you open to hybrid work in Ahmedabad?</span></div>' +
    '<div class="m-aq-qrow"><span class="m-aq-ck"></span><span>Have you led an AI/ML project end-to-end?</span></div>' +
    "</div>" +
    '<div class="m-aq-foot">' +
    '<span class="m-aq-sel" id="aqBankSel">0 selected</span>' +
    '<div class="m-aq-actions"><span class="m-btn ghost">Cancel</span>' +
    '<span class="m-btn pri locked" id="aqBankAddBtn">Add 1 Question</span></div></div></div>'
  );
}

function writeModalBody(): string {
  return (
    '<div class="m-aq-dialog" id="aqWriteDialog" hidden>' +
    '<div class="m-aq-dialog-head">' +
    '<div class="m-aq-dialog-title">' +
    IC.clipboardList +
    " <span>Add Question</span></div>" +
    '<p class="m-aq-dialog-sub">Add a screening question candidates answer when they apply.</p></div>' +
    aqTabs("write") +
    '<div class="m-aq-write">' +
    '<div class="m-desc-area" id="aqWriteArea" data-type="' +
    AQ_WRITE_Q +
    '"></div>' +
    '<div class="m-desc-count" id="aqWriteCount">0 / 500</div></div>' +
    '<div class="m-aq-type-field">' +
    '<label class="m-aq-type-label" id="aqAnswerTypeLabel">Answer type <span class="m-aq-req">*</span></label>' +
    '<button type="button" class="m-pm-select m-aq-type-select" id="aqAnswerTypeSelect" ' +
    'role="combobox" aria-expanded="false" aria-haspopup="listbox" ' +
    'aria-controls="aqAnswerTypeMenu" aria-labelledby="aqAnswerTypeLabel">' +
    '<span class="m-aq-type-value" id="aqAnswerTypeValue">Select an answer type</span>' +
    IC.chevDown +
    "</button>" +
    '<div class="m-aq-type-menu" id="aqAnswerTypeMenu" role="listbox" ' +
    'aria-labelledby="aqAnswerTypeLabel" hidden>' +
    '<button type="button" class="m-aq-type-opt" id="aqAnswerTypeOptYesNo" ' +
    'role="option" aria-selected="false">Yes / No</button>' +
    '<button type="button" class="m-aq-type-opt" id="aqAnswerTypeOptText" ' +
    'role="option" aria-selected="false">Text answer</button>' +
    "</div>" +
    '<p class="m-aq-type-hint" id="aqAnswerTypeHint" hidden>' +
    "Candidates answer with Yes or No." +
    "</p></div>" +
    '<div class="m-row m-aq-save-row" id="aqSaveToBankRow" style="gap:6px;margin:8px 12px 0;align-items:center">' +
    '<span class="m-aq-ck" id="aqSaveToBankCk"></span>' +
    '<span style="font-size:8.5px;color:#6B7280">Save to bank for reuse in future job posts</span></div>' +
    '<div class="m-aq-foot" style="margin-top:10px">' +
    "<span></span>" +
    '<div class="m-aq-actions"><span class="m-btn ghost">Cancel</span>' +
    '<span class="m-btn pri locked" id="aqWriteAddBtn">Add Question</span></div></div></div>'
  );
}

/** Interactive Assessment step shell — phases driven by bindAssessmentDemo. */
export function assessmentInteractiveHtml(): string {
  return (
    '<div class="m-aq-scene m-pm-scene" id="aqScene">' +
    '<div id="aqBackdrop">' +
    '<div class="m-step-head"><h2 class="m-step-h2">Assessment Questions</h2>' +
    '<p class="m-step-sub">Optionally add screening questions candidates answer when they apply. You can add, reorder, edit, or remove them anytime.</p></div>' +
    '<div class="m-skill-info">' +
    IC.info +
    " <span>Follow the pink highlights: bank pick first, then write a fresh question, choose <b>Answer type</b>, and tick <b>Save to bank</b>.</span></div>" +
    '<div class="m-card" style="margin-top:9px;padding:10px 12px">' +
    '<div class="m-row" style="gap:7px;align-items:flex-start">' +
    '<span style="width:14px;height:14px;border-radius:4px;background:#9F81BD;color:#fff;display:grid;place-items:center;font-size:9px;font-weight:800;flex-shrink:0">✓</span>' +
    '<div><div style="font-size:9.5px;font-weight:800;color:#0B1020">This job has an assessment</div>' +
    '<div style="font-size:8.5px;color:#6B7280;margin-top:2px">Turn this on to add screening questions to this job post.</div></div>' +
    "</div></div>" +
    '<div class="m-row" style="margin-top:10px;justify-content:space-between;align-items:center">' +
    '<span class="m-badge pu" id="aqCount">0 questions</span>' +
    '<span class="m-btn pri" id="aqOpenAddBtn" style="padding:5px 10px;font-size:9px">' +
    IC.plus +
    " Add Question</span></div>" +
    '<div id="aqEmpty" class="m-card" style="margin-top:8px;padding:14px 10px;text-align:center;border-style:dashed">' +
    '<div style="font-size:9.5px;font-weight:700;color:#0B1020">No questions yet</div>' +
    '<div style="font-size:8.5px;color:#6B7280;margin-top:3px">Use &quot;Add Question&quot; to write one or pick from your bank.</div></div>' +
    '<div id="aqQuestionList"></div>' +
    "</div>" +
    '<div class="m-pm-overlay m-aq-overlay" id="aqOverlay" hidden>' +
    bankModalBody() +
    writeModalBody() +
    "</div></div>" +
    '<div class="m-wiz-foot" id="aqFoot" hidden>' +
    '<span class="m-btn continue" id="aqContinue">Continue</span></div>'
  );
}
