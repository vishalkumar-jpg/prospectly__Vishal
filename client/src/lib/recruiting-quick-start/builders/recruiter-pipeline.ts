import { RECRUITER_PIPELINE_STAGES } from "../constants";
import { IC } from "../icons";
import { PIPE_DEMO } from "./pipeline-demo";

type PipeCard = {
  anonLabel: string;
  anonAvatar: string;
  revealedName: string;
  title: string;
  company: string;
  years: number;
  stage: string;
  revealed?: boolean;
  linkedin?: boolean;
  hotView?: boolean;
  hotAction?: { label: string; callout: string; id: string; icon: string };
  hiredPayouts?: boolean;
};

const STAGE_COLORS: Record<string, string> = {
  in_review: "am",
  shortlisted: "pu",
  interview_invite_sent: "bl",
  interview_scheduled: "gn",
  interview_completed: "cy",
  hired: "em",
  rejected: "sl",
};

function priBtn(
  label: string,
  icon: string,
  opts?: { id?: string; hot?: boolean; callout?: string }
): string {
  const cls = "m-pipe-btn pri" + (opts?.hot ? " qsd-hot" : "");
  const attrs =
    opts?.hot && opts.id
      ? ' id="' +
        opts.id +
        '" data-callout="' +
        (opts.callout ?? label) +
        '" data-co-side="right"'
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

function neutralBtn(
  label: string,
  icon: string,
  opts?: { id?: string; hot?: boolean; callout?: string }
): string {
  const cls = "m-pipe-btn" + (opts?.hot ? " qsd-hot" : "");
  const attrs =
    opts?.hot && opts.id
      ? ' id="' +
        opts.id +
        '" data-callout="' +
        (opts.callout ?? "Click " + label) +
        '" data-co-side="right"'
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

function pipeCardHtml(c: PipeCard, backdrop = false): string {
  const tint = STAGE_COLORS[c.stage] ?? "am";
  const displayName = c.revealed ? c.revealedName : c.anonLabel;
  const showReject = c.stage === "in_review" || c.stage === "shortlisted";
  const showReschedule = c.stage === "interview_scheduled";
  const showShortlist =
    c.stage === "in_review" && c.hotAction?.id === "pipeShortlist";

  let primaryAction = "";
  if (
    c.hotAction &&
    c.hotAction.id !== "pipeShortlist" &&
    c.hotAction.id !== "pipeReschedule"
  ) {
    primaryAction = priBtn(c.hotAction.label, c.hotAction.icon, {
      id: backdrop ? undefined : c.hotAction.id,
      hot: !backdrop,
      callout: c.hotAction.callout,
    });
  } else if (c.stage === "shortlisted") {
    primaryAction = priBtn("Schedule", IC.calendar, {
      id: backdrop ? undefined : "pipeSchedule",
      hot: !backdrop && c.hotAction?.id === "pipeSchedule",
      callout: "Schedule interview",
    });
  } else if (c.stage === "interview_scheduled") {
    primaryAction = priBtn("Mark Outcome", IC.checkCircle, {
      id: backdrop ? undefined : "pipeOutcome",
      hot: !backdrop && c.hotAction?.id === "pipeOutcome",
      callout: "Mark interview outcome",
    });
  } else if (c.stage === "interview_completed") {
    primaryAction = priBtn("Move to Hired", IC.badgeCheck, {
      id: backdrop ? undefined : "pipeHire",
      hot: !backdrop && c.hotAction?.id === "pipeHire",
      callout: "Move to Hired",
    });
  }

  const hiredBtns = c.hiredPayouts
    ? priBtn("Release Connector Payout", IC.wallet) +
      priBtn("Release Candidate Bonus", IC.wallet)
    : "";

  const shortlistBtn =
    showShortlist && c.hotAction
      ? priBtn("Shortlist", IC.thumbsUp, {
          id: backdrop ? undefined : c.hotAction.id,
          hot: !backdrop,
          callout: c.hotAction.callout,
        })
      : "";

  return (
    '<div class="m-pipe-card">' +
    '<div class="m-pipe-card-top">' +
    '<div class="m-pipe-av m-pipe-av-' +
    tint +
    '">' +
    c.anonAvatar +
    "</div>" +
    "<b>" +
    displayName +
    "</b></div>" +
    '<div class="m-pipe-rows">' +
    '<div class="m-pipe-row">' +
    IC.briefcase +
    "<span>" +
    c.title +
    "</span></div>" +
    '<div class="m-pipe-row">' +
    IC.building +
    "<span>" +
    c.company +
    "</span></div>" +
    '<div class="m-pipe-row">' +
    IC.clock +
    "<span>" +
    c.years +
    " Years of Experience</span></div>" +
    (c.revealed && c.linkedin
      ? '<div class="m-pipe-row m-pipe-linkedin">' +
        IC.linkedin +
        '<span class="m-pipe-li">LinkedIn</span></div>'
      : "") +
    "</div>" +
    '<div class="m-pipe-actions">' +
    '<div class="m-pipe-row-btns">' +
    neutralBtn("View", IC.eye, {
      id: backdrop ? undefined : "pipeView",
      hot: !backdrop && !!c.hotView,
      callout: "Click View",
    }) +
    (showReject ? neutralBtn("Reject", IC.thumbsDown, { hot: false }) : "") +
    (showReschedule
      ? neutralBtn("Reschedule", IC.calendar, {
          id: backdrop ? undefined : "pipeReschedule",
          hot: !backdrop && c.hotAction?.id === "pipeReschedule",
          callout: "Reschedule interview",
        })
      : "") +
    "</div>" +
    shortlistBtn +
    primaryAction +
    hiredBtns +
    "</div></div>"
  );
}

function columnHtml(
  stageKey: string,
  label: string,
  cards: string,
  count: number
): string {
  const headCls = STAGE_COLORS[stageKey] ?? "sl";
  return (
    '<div class="m-pipe-col">' +
    '<div class="m-pipe-col-head m-pipe-head-' +
    headCls +
    '"><span class="m-pipe-dot"></span>' +
    label +
    '<span class="m-pipe-count">' +
    count +
    "</span></div>" +
    '<div class="m-pipe-col-body">' +
    (cards || '<div class="m-pipe-empty">No candidates</div>') +
    "</div></div>"
  );
}

export type PipelineScene =
  | "view_candidate"
  | "shortlist_candidate"
  | "shortlisted"
  | "interview_scheduled"
  | "mark_outcome"
  | "move_hired"
  | "hired_done";

function sceneCard(scene: PipelineScene): PipeCard {
  const base: PipeCard = {
    anonLabel: PIPE_DEMO.anonLabel,
    anonAvatar: PIPE_DEMO.anonAvatar,
    revealedName: PIPE_DEMO.revealedName,
    title: PIPE_DEMO.title,
    company: PIPE_DEMO.company,
    years: PIPE_DEMO.years,
    stage: "in_review",
  };

  if (scene === "view_candidate") {
    return { ...base, stage: "in_review", hotView: true };
  }
  if (scene === "shortlist_candidate") {
    return {
      ...base,
      stage: "in_review",
      hotAction: {
        id: "pipeShortlist",
        label: "Shortlist",
        callout: "Click Shortlist",
        icon: IC.thumbsUp,
      },
    };
  }
  if (scene === "shortlisted") {
    return {
      ...base,
      stage: "shortlisted",
      hotAction: {
        id: "pipeSchedule",
        label: "Schedule",
        callout: "Schedule interview",
        icon: IC.calendar,
      },
    };
  }
  if (scene === "interview_scheduled") {
    return {
      ...base,
      stage: "interview_scheduled",
      hotAction: {
        id: "pipeReschedule",
        label: "Reschedule",
        callout: "Reschedule interview",
        icon: IC.calendar,
      },
    };
  }
  if (scene === "mark_outcome") {
    return {
      ...base,
      stage: "interview_scheduled",
      hotAction: {
        id: "pipeOutcome",
        label: "Mark Outcome",
        callout: "Mark interview outcome",
        icon: IC.checkCircle,
      },
    };
  }
  if (scene === "move_hired") {
    return {
      ...base,
      stage: "interview_completed",
      revealed: true,
      linkedin: true,
      hotAction: {
        id: "pipeHire",
        label: "Move to Hired",
        callout: "Move to Hired",
        icon: IC.badgeCheck,
      },
    };
  }
  return {
    ...base,
    stage: "hired",
    revealed: true,
    linkedin: true,
    hiredPayouts: true,
  };
}

export function recruiterPipelineHtml(
  scene: PipelineScene,
  opts?: { backdrop?: boolean }
): string {
  const backdrop = opts?.backdrop ?? false;
  const card = sceneCard(scene);

  const foot =
    scene === "hired_done"
      ? '<div class="m-wiz-foot m-pipe-wiz-foot">' +
        '<span class="m-btn continue qsd-hot" id="pipeContinue" data-callout="Click Continue" data-co-side="top">Continue →</span>' +
        "</div>"
      : "";

  const byStage: Record<string, PipeCard[]> = {};
  RECRUITER_PIPELINE_STAGES.forEach(([key]) => {
    byStage[key] = [];
  });
  if (byStage[card.stage]) byStage[card.stage].push(card);

  const cols = RECRUITER_PIPELINE_STAGES.map(([key, label]) => {
    const list = byStage[key] || [];
    const html = list.map((c) => pipeCardHtml(c, backdrop)).join("");
    return columnHtml(key, label, html, list.length);
  }).join("");

  return (
    '<div class="m-pipe-page">' +
    '<div class="m-pipe-head"><h1 class="m-pipe-title">' +
    PIPE_DEMO.jobPostTitle +
    "</h1></div>" +
    '<div class="m-pipe-board">' +
    cols +
    "</div>" +
    foot +
    "</div>"
  );
}
