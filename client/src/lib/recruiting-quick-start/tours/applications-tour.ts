import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  myApplicationsHtml,
  myApplicationsWithDrawer,
} from "../builders/my-applications";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const applicationsTour: Tour = {
  id: "applications",
  meta: [
    {
      t: "Open My Applications",
      d: "Every job you applied to, with a live status — no need to email and ask. Click <b>My Applications</b> in the sidebar.",
    },
    {
      t: "Live status & skill match",
      d: "Status from <b>Applied → Under Review → Interview → Offer</b> with dates — and which of your skills <b>matched</b> vs were <b>missing</b>. Click <b>Details</b> on a card.",
    },
    {
      t: "View job details",
      d: "See the full role — payout, skills, requirements, and benefits — without leaving your applications list. Click <b>Continue</b> when you’re ready.",
    },
    {
      t: "Always in the loop ✅",
      d: "<b>Not Selected</b> / <b>JD Mismatched</b> tell you honestly when it didn’t work out. Everything updates automatically. Click <b>Done</b>.",
    },
  ],
  label: "Track Your Applications",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Applied somewhere? 💼</div><div class="m-sub">Never wonder "did they see my CV?" again.</div>' +
          '<div class="m-card"><b style="font-size:11px">2 applications updated</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>My Applications</b> for live status.</div></div>',
        "applications",
        'Click "My Applications"'
      ),
    () => shellFullWidth(myApplicationsHtml({ hotDetails: true })),
    () => shellFullWidth(myApplicationsWithDrawer({ showContinue: true })),
    () =>
      okScreen(
        "Always in the loop ✅",
        'Statuses flow: Applied → Under Review → Interview → Offer → Accepted. "Not Selected" or "JD Mismatched" tell you honestly when it didn’t work out.'
      ),
  ],
};
