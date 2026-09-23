import {
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Video,
  Phone,
  Building,
  PartyPopper,
  Gift,
  Eye,
  Loader,
} from "lucide-react";

export const STATUS_CONFIG = {
  applied: {
    label: "Applied",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    hoverColor: "hover:bg-blue-600 hover:text-white hover:border-blue-700",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    hoverColor: "hover:bg-purple-600 hover:text-white hover:border-purple-700",
    icon: Eye,
  },
  processing: {
    label: "Processing",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    hoverColor: "hover:bg-gray-600 hover:text-white hover:border-gray-700",
    icon: Loader,
  },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    hoverColor: "hover:bg-purple-600 hover:text-white hover:border-purple-700",
    icon: CheckCircle,
  },
  interview_invite_sent: {
    label: "Interview Invite Sent",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    hoverColor: "hover:bg-blue-600 hover:text-white hover:border-blue-700",
    icon: Calendar,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    hoverColor: "hover:bg-indigo-600 hover:text-white hover:border-indigo-700",
    icon: Calendar,
  },
  interview_completed: {
    label: "Interview Completed",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    hoverColor: "hover:bg-cyan-600 hover:text-white hover:border-cyan-700",
    icon: CheckCircle,
  },
  offer_received: {
    label: "Offer Received",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverColor: "hover:bg-emerald-600 hover:text-white hover:border-emerald-700",
    icon: Gift,
  },
  offer_extended: {
    label: "Offer Extended",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverColor: "hover:bg-emerald-600 hover:text-white hover:border-emerald-700",
    icon: Gift,
  },
  offer_accepted: {
    label: "Offer Accepted",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    hoverColor: "hover:bg-indigo-600 hover:text-white hover:border-indigo-700",
    icon: PartyPopper,
  },
  rejected: {
    label: "Not Selected",
    color: "bg-slate-50 text-slate-600 border-slate-200",
    hoverColor: "hover:bg-slate-600 hover:text-white hover:border-slate-700",
    icon: XCircle,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    hoverColor: "hover:bg-slate-600 hover:text-white hover:border-slate-700",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    hoverColor: "hover:bg-slate-600 hover:text-white hover:border-slate-700",
    icon: Clock,
  },
  jd_mismatched: {
    label: "JD Mismatched",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    hoverColor: "hover:bg-orange-600 hover:text-white hover:border-orange-700",
    icon: XCircle,
  },
} as const;

export type StatusType = keyof typeof STATUS_CONFIG;
