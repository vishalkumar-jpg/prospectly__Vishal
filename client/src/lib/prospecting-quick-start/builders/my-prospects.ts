import { IC } from "../icons";
import {
  buildTourCard,
  MP_PIPELINE_STAGES,
  MP_SCENE_HINT,
  MP_SCENE_HOT,
  type MpHotAction,
  type MpPipelineCard,
  type MpPipelineScene,
  type MpStageId,
} from "./my-prospects-demo";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function neutralBtn(
  label: string,
  icon: string,
  opts?: {
    id?: string;
    hot?: boolean;
    callout?: string;
    calloutSide?: "left" | "right" | "top";
  }
): string {
  const cls = "m-mp-btn" + (opts?.hot ? " qsd-hot" : "");
  const side = opts?.calloutSide ?? "right";
  const attrs =
    opts?.hot && opts.id
      ? ' id="' +
        opts.id +
        '" data-callout="' +
        (opts.callout ?? "Click " + label) +
        '" data-co-side="' +
        side +
        '"'
      : opts?.id
        ? ' id="' + opts.id + '"'
        : "";
  return (
    '<button type="button" class="' +
    cls +
    '"' +
    attrs +
    ">" +
    icon +
    "<span>" +
    label +
    "</span></button>"
  );
}

function primaryBtn(
  label: string,
  icon: string,
  opts?: {
    id?: string;
    hot?: boolean;
    callout?: string;
    calloutSide?: "left" | "right" | "top";
    join?: boolean;
  }
): string {
  const cls =
    "m-mp-btn pri" +
    (opts?.join ? " m-mp-join-btn" : "") +
    (opts?.hot ? " qsd-hot" : "");
  const side = opts?.calloutSide ?? "right";
  const attrs =
    opts?.hot && opts.id
      ? ' id="' +
        opts.id +
        '" data-callout="' +
        (opts.callout ?? "Click " + label) +
        '" data-co-side="' +
        side +
        '"'
      : opts?.id
        ? ' id="' + opts.id + '"'
        : "";
  return (
    '<button type="button" class="' +
    cls +
    '"' +
    attrs +
    ">" +
    icon +
    "<span>" +
    label +
    "</span></button>"
  );
}

function cardActions(
  card: MpPipelineCard,
  scene: MpPipelineScene,
  backdrop: boolean
): string {
  const hotCfg = MP_SCENE_HOT[scene];
  const isHotCard = !!hotCfg && hotCfg && !backdrop;

  const hotFor = (action: MpHotAction) =>
    isHotCard && hotCfg?.action === action
      ? {
          id: hotCfg.btnId,
          hot: true,
          callout: hotCfg.callout,
          calloutSide: hotCfg.calloutSide,
        }
      : undefined;

  const buttons = [neutralBtn("Details", IC.eye, hotFor("details"))];
  if (card.showMarket) buttons.push(neutralBtn("Market", IC.globe));
  if (card.connectorName) {
    buttons.push(neutralBtn("Finance", IC.receipt, hotFor("finance")));
  }

  const gridClass = buttons.length >= 3 ? " m-mp-actions-grid" : "";
  let html =
    '<div class="m-mp-actions' + gridClass + '">' + buttons.join("") + "</div>";

  if (card.showJoin) {
    html += primaryBtn("Join", IC.video, {
      join: true,
    });
  }
  if (card.showConfirm) {
    html += primaryBtn("Confirm", IC.checkCircle, hotFor("confirm"));
  }
  if (card.showFeedback) {
    html += primaryBtn("Feedback", IC.messageSquare, hotFor("feedback"));
  }

  return html;
}

function connectorRow(card: MpPipelineCard): string {
  if (card.pendingConnectors) {
    const n = card.pendingConnectors;
    return (
      '<div class="m-mp-connector pending">' +
      IC.users +
      "<span>" +
      n +
      " Connector" +
      (n !== 1 ? "s" : "") +
      " Pending</span></div>"
    );
  }
  if (card.connectorName) {
    return (
      '<div class="m-mp-connector">' +
      IC.handshake +
      "<span>Connector:</span> <em>" +
      card.connectorName +
      "</em></div>"
    );
  }
  return "";
}

function pipelineCardHtml(
  card: MpPipelineCard,
  scene: MpPipelineScene,
  backdrop: boolean
): string {
  const tint =
    MP_PIPELINE_STAGES.find((s) => s.id === card.stage)?.color ?? "bl";
  const hotCfg = MP_SCENE_HOT[scene];
  const isHotCard = !!hotCfg && !backdrop;
  return (
    '<div class="m-mp-card' +
    (isHotCard ? " m-mp-card-hot" : "") +
    '">' +
    '<div class="m-mp-card-top">' +
    '<div class="m-mp-meeting">' +
    card.meetingTitle +
    "</div>" +
    '<div class="m-mp-bounty">$' +
    card.bounty.toLocaleString() +
    "</div></div>" +
    '<div class="m-mp-person">' +
    '<div class="m-mp-av m-mp-av-' +
    tint +
    '">' +
    initials(card.prospectName) +
    "</div>" +
    "<div><b>" +
    card.prospectName +
    "</b><span>" +
    card.prospectTitle +
    "</span></div></div>" +
    connectorRow(card) +
    cardActions(card, scene, backdrop) +
    "</div>"
  );
}

function pipelineEducationGuideHtml(
  scene: MpPipelineScene,
  opts?: { showContinue?: boolean }
): string {
  const hint = MP_SCENE_HINT[scene];
  if (!hint) return "";
  const showContinue = opts?.showContinue !== false;
  let html =
    '<div class="m-mp-edu-guide m-wiz-foot' +
    (showContinue ? "" : " m-mp-edu-guide-no-btn") +
    '">' +
    '<div class="m-mp-edu-guide-text">' +
    '<span class="m-mp-edu-stage">' +
    hint.title +
    "</span>" +
    "<p>" +
    hint.body +
    "</p></div>";
  if (showContinue) {
    html +=
      '<button type="button" class="m-mp-edu-next qsd-hot continue" id="mpTourContinueBtn" data-callout="Click Continue" data-co-side="top">Continue →</button>';
  }
  return html + "</div>";
}

function pipelineColumn(
  stageId: MpStageId,
  title: string,
  color: string,
  card: MpPipelineCard | null,
  scene: MpPipelineScene,
  backdrop: boolean,
  highlightStage: MpStageId | null
): string {
  const cards = card && card.stage === stageId ? [card] : [];
  const live = highlightStage === stageId ? " m-mp-col-live" : "";
  return (
    '<div class="m-mp-col' +
    live +
    '">' +
    '<div class="m-mp-col-head m-mp-head-' +
    color +
    '">' +
    '<span class="m-mp-dot"></span>' +
    title +
    '<span class="m-mp-count">' +
    cards.length +
    "</span></div>" +
    '<div class="m-mp-col-body">' +
    cards.map((c) => pipelineCardHtml(c, scene, backdrop)).join("") +
    "</div></div>"
  );
}

function pipelineTabsBar(): string {
  return (
    '<div class="m-mp-tabs-bar">' +
    '<div class="m-mp-tabs">' +
    '<button type="button" class="m-mp-tab on">' +
    IC.gitBranch +
    "<span>Open Requests</span>" +
    '<span class="m-mp-tab-badge on">1</span></button>' +
    '<button type="button" class="m-mp-tab">' +
    IC.archive +
    "<span>Archive</span>" +
    '<span class="m-mp-tab-badge">0</span></button></div></div>'
  );
}

export function myProspectsPipelineHtml(
  scene: MpPipelineScene = "overview",
  opts?: { backdrop?: boolean }
): string {
  const backdrop = opts?.backdrop ?? false;
  const card = buildTourCard(scene);
  const highlightStage = MP_SCENE_HINT[scene]?.stage ?? card.stage ?? null;
  const board = MP_PIPELINE_STAGES.map((stage) =>
    pipelineColumn(
      stage.id,
      stage.title,
      stage.color,
      card,
      scene,
      backdrop,
      highlightStage
    )
  ).join("");

  return (
    '<div class="m-mp-page">' +
    '<div class="m-mp-head">' +
    "<h1>My Prospects</h1>" +
    "<p>Manage your open requests to meet prospects</p></div>" +
    pipelineTabsBar() +
    '<div class="m-mp-board">' +
    board +
    "</div></div>"
  );
}

/** Pipeline board with in-content stage guide + optional Continue button (education steps). */
export function myProspectsPipelineEducation(
  scene: MpPipelineScene,
  opts?: { showContinue?: boolean }
): string {
  const inner = myProspectsPipelineHtml(scene).slice(
    '<div class="m-mp-page">'.length,
    -"</div>".length
  );
  return (
    '<div class="m-mp-page m-mp-edu-step">' +
    inner +
    pipelineEducationGuideHtml(scene, opts) +
    "</div>"
  );
}

export function myProspectsPipelineWithContinue(
  scene: MpPipelineScene = "journey_complete"
): string {
  const inner = myProspectsPipelineHtml(scene).slice(
    '<div class="m-mp-page">'.length,
    -"</div>".length
  );
  return (
    '<div class="m-mp-page m-mp-done-step">' +
    inner +
    '<div class="m-mp-foot m-wiz-foot">' +
    '<button type="button" class="m-mp-continue qsd-hot continue" id="mpContinueBtn" data-callout="Click Continue" data-co-side="top">Continue →</button></div></div>'
  );
}
