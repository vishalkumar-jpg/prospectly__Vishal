import { svgIc } from "../icons";
import type { QuickStartRuntime } from "./context";

/** Per-character interval inside runTypeEffects typing animation. */
export const TYPE_EFFECT_CHAR_MS = 32;
/** Extra pause after typing finishes before the next demo step. */
export const TYPE_EFFECT_SETTLE_MS = 120;
/** Default start delay when callers omit the delay arg. */
export const TYPE_EFFECT_DEFAULT_DELAY_MS = 180;
/** Stagger between multiple `.qsd-type` nodes. */
export const TYPE_EFFECT_NODE_STAGGER_MS = 280;

export function runTypeEffects(
  rt: QuickStartRuntime,
  sel?: string,
  delay = TYPE_EFFECT_DEFAULT_DELAY_MS
): void {
  const { stage } = rt.dom;
  const nodes = stage.querySelectorAll(sel || ".qsd-type");
  nodes.forEach((el, i) => {
    const text = el.getAttribute("data-type") || "";
    if (!text) return;
    el.textContent = "";
    el.classList.add("typing");
    setTimeout(
      () => {
        let n = 0;
        const timer = setInterval(() => {
          n++;
          el.textContent = text.slice(0, n);
          if (n >= text.length) {
            clearInterval(timer);
            el.classList.remove("typing");
          }
        }, TYPE_EFFECT_CHAR_MS);
      },
      delay + i * TYPE_EFFECT_NODE_STAGGER_MS
    );
  });
}

function addSkillBadge(
  rt: QuickStartRuntime,
  boxId: string,
  countId: string,
  skill: string,
  color: "grn" | "blu"
): void {
  const { stage } = rt.dom;
  const box = stage.querySelector(boxId);
  const countEl = stage.querySelector(countId);
  if (!box) return;
  const empty = box.querySelector(".m-skill-empty");
  if (empty) empty.remove();
  const b = document.createElement("span");
  b.className = "m-sbadge " + (color === "blu" ? "blu" : "grn");
  b.innerHTML =
    skill +
    ' <span class="x">' +
    svgIc('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 8, 8) +
    "</span>";
  box.appendChild(b);
  if (countEl) {
    const n = box.querySelectorAll(".m-sbadge").length;
    countEl.textContent = n + " / 50";
  }
}

function typeInInput(
  rt: QuickStartRuntime,
  inpId: string,
  text: string,
  cb?: () => void
): void {
  const inp = rt.dom.stage.querySelector(inpId) as HTMLInputElement | null;
  if (!inp) {
    cb?.();
    return;
  }
  inp.value = "";
  let n = 0;
  const t = setInterval(() => {
    n++;
    inp.value = text.slice(0, n);
    if (n >= text.length) {
      clearInterval(t);
      cb?.();
    }
  }, 55);
}

export function runSkillsDemo(rt: QuickStartRuntime): void {
  const seq = [
    {
      inp: "#reqSkillInp",
      skill: "Python",
      box: "#reqSkillBadges",
      cnt: "#reqCount",
      c: "grn" as const,
      wait: 400,
    },
    {
      inp: "#reqSkillInp",
      skill: "LLMs",
      box: "#reqSkillBadges",
      cnt: "#reqCount",
      c: "grn" as const,
      wait: 900,
    },
    {
      inp: "#reqSkillInp",
      skill: "System Design",
      box: "#reqSkillBadges",
      cnt: "#reqCount",
      c: "grn" as const,
      wait: 1400,
    },
    {
      inp: "#prefSkillInp",
      skill: "AWS",
      box: "#prefSkillBadges",
      cnt: "#prefCount",
      c: "blu" as const,
      wait: 2200,
    },
  ];
  seq.forEach((s) => {
    setTimeout(() => {
      typeInInput(rt, s.inp, s.skill, () => {
        addSkillBadge(rt, s.box, s.cnt, s.skill, s.c);
      });
    }, s.wait);
  });
}

export function runSuccessDemo(rt: QuickStartRuntime): void {
  const { stage } = rt.dom;
  setTimeout(() => {
    const chk = stage.querySelector("#successChk");
    const fields = stage.querySelector("#successFields") as HTMLElement | null;
    const box = chk?.querySelector(".m-chk-box");
    if (box) {
      box.classList.add("on");
      box.innerHTML = svgIc('<path d="M20 6 9 17l-5-5"/>', 10, 10);
    }
    if (fields) fields.style.display = "";
    setTimeout(() => runTypeEffects(rt, "#successAmt,#successProb", 100), 400);
  }, 500);
}

export function runPaymentDemo(rt: QuickStartRuntime): void {
  setTimeout(() => runTypeEffects(rt, "#cardNum,#cardExp,#cardCvc", 250), 400);
}
