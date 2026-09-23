import { IC } from "../icons";

function pickIcon(icHtml: string): string {
  return (
    '<span class="qs-pick-ic">' +
    icHtml.replace(/class="m-ic[^"]*"/, 'class="qs-pick-svg"') +
    "</span>"
  );
}

/** Sidebar-matched icons — foreground stroke, theme neutral */
export const QS_PICK_ICONS = {
  recruiting: pickIcon(IC.briefcase),
  prospecting: pickIcon(IC.target),
  recruiter: pickIcon(IC.clipboardList),
  connector: pickIcon(IC.link),
  candidate: pickIcon(IC.userCheck),
  findProspect: pickIcon(IC.search),
  completeRequest: pickIcon(IC.users),
  opportunity: pickIcon(IC.award),
};
