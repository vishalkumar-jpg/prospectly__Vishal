import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  findProspectsPageHtml,
  findProspectsWithProfileModal,
  findProspectsWithIntroModal,
} from "../builders/find-prospect";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const findProspectTour: Tour = {
  id: "find-prospect",
  label: "Find a Prospect & Request an Intro",
  meta: [
    {
      t: "Open Find Prospects",
      d: "Start by searching your network for the right person to meet. Click <b>Find Prospects</b> in the sidebar.",
    },
    {
      t: "Search for a prospect",
      d: "Enter a <b>LinkedIn URL</b> or fill in <b>name, email, company, and website</b> — then click <b>Search Prospects</b>.",
    },
    {
      t: "Review search results",
      d: "Matching prospects appear below with referral payout amounts. Click <b>More Info</b> on a card to view their full profile.",
    },
    {
      t: "Open the profile",
      d: "Review the prospect’s headline, company, and background. When ready, click <b>Request Intro</b>.",
    },
    {
      t: "Send introduction request",
      d: "Add <b>meeting details</b>, description, and context — then send your introduction request to connectors in your network.",
    },
    {
      t: "Request sent ✓",
      d: "Your request is live. Track progress under <b>My Prospects</b> as connectors accept and send the warm intro. Click <b>Done</b>.",
    },
  ],
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Find your next prospect 🎯</div><div class="m-sub">Search professionals in your network and request warm introductions with a referral bounty.</div>' +
          '<div class="m-card"><b style="font-size:11px">Ready to search</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Find Prospects</b> to start your first introduction request.</div></div>',
        "find-prospects",
        'Click "Find Prospects"'
      ),
    () => shellFullWidth(findProspectsPageHtml()),
    () =>
      shellFullWidth(
        findProspectsPageHtml({
          filled: true,
          showResults: true,
          hotMoreInfo: true,
        })
      ),
    () => shellFullWidth(findProspectsWithProfileModal()),
    () => shellFullWidth(findProspectsWithIntroModal()),
    () =>
      okScreen(
        "Introduction request sent! 🎯",
        "Your request is now live. Track it under My Prospects as connectors accept and send the warm introduction."
      ),
  ],
};
