import type { PublicRequestData } from "@/lib/api/marketplace";
import type { PublicDealData } from "@/pages/public-deal";

export function toPublicDealData(data: PublicRequestData): PublicDealData {
  return {
    id: data.id,
    prospect: {
      name: data.prospect?.name ?? data.contactName ?? null,
      title: data.prospect?.title ?? data.contactTitle ?? null,
      company: data.prospect?.organization?.name ?? data.contactCompany ?? null,
      headline: data.prospect?.headline ?? null,
      location: data.prospect?.location ?? null,
      linkedinUrl: data.prospect?.linkedinUrl ?? null,
      photoUrl: data.prospect?.photoUrl ?? null,
      organization: data.prospect?.organization ?? null,
    },
    meetingAgenda: {
      title: data.meetingTitle,
      description: data.meetingDescription,
    },
    bountyAmount: data.bountyAmount,
    claimerShare: data.claimerShare,
    connectorShare: data.sharerShare,
    interestedCount: data.interestedCount || 0,
    viewCount: data.viewCount || 0,
    isClaimed: data.isClaimed || false,
    createdAt: data.createdAt ?? null,
  };
}
