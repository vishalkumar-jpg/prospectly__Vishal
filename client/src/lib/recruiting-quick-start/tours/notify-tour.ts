import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  myJobPostsPageHtml,
  sendNotificationModalHtml,
} from "../builders/my-job-posts";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const notifyTour: Tour = {
  id: "notify",
  meta: [
    {
      t: "Open My Job Posts",
      d: "Notifications are sent from <b>My Job Posts</b>. Click the pink menu item in the sidebar.",
    },
    {
      t: "Open the job menu",
      d: "Find your job card and click the <b>⋮ three-dot menu</b> in the top-right corner.",
    },
    {
      t: "Send Notification",
      d: "Choose <b>Send Notification</b> from the dropdown menu.",
    },
    {
      t: "Pick who to email",
      d: "Select an <b>Organization</b> — we’ll auto-select one for the demo. Then click <b>Send Notification</b>.",
    },
    {
      t: "Notification queued ✓",
      d: "Members are emailed in the background. You can also notify while posting a job, or resend later from My Job Posts. Click <b>Done</b>.",
    },
  ],
  label: "Send a Job Notification",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Spread the word 📣</div><div class="m-sub">Just posted a job? Email your organizations so the right people see it.</div>' +
          '<div class="m-card"><b style="font-size:11px">Your job is live</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>My Job Posts</b> to send a notification.</div></div>',
        "my-jobs",
        'Click "My Job Posts"'
      ),
    () => shellFullWidth(myJobPostsPageHtml({ hotMenu: true })),
    () =>
      shellFullWidth(
        myJobPostsPageHtml({ menuState: "open", hotSendNotify: true })
      ),
    () => shellFullWidth(sendNotificationModalHtml({ orgSelected: false })),
    () =>
      okScreen(
        "Notification queued ✓",
        "Members of the selected Organization will be emailed shortly. You can also notify while posting a job, or come back here to send it again later."
      ),
  ],
};
