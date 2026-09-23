import { WIZARD_STEPS } from "../constants";

export function verticalRail(activeIdx: number): string {
  let html = '<div class="m-vrail"><p class="m-vrail-title">Progress</p>';
  WIZARD_STEPS.forEach((title, i) => {
    let cls = "m-vstep";
    if (i === activeIdx) cls += " on";
    else if (i < activeIdx) cls += " done";
    const num = i < activeIdx ? "\u2713" : i + 1;
    html +=
      '<div class="' +
      cls +
      '"><span class="m-vnum">' +
      num +
      "</span><span>" +
      title +
      "</span></div>";
  });
  return html + "</div>";
}
