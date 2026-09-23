import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Briefcase,
  Check,
  X,
  MessageSquare,
  Award,
  Target,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

// Mock data for connector's candidate submissions
interface CandidateSubmission {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateInitials: string;
  stage:
    | "pending_approval"
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "offer_accepted"
    | "rejected";
  matchScore: number;
  bountyAmount: number;
  connectorShare: number; // 70% or 35% if shared
  isFromShare: boolean;
  sharedBy?: string;
  submittedAt: string;
  lastUpdated: string;
  requesterFeedback?: string;
}

const mockCandidateSubmissions: CandidateSubmission[] = [
  {
    id: "sub-1",
    jobId: "job-1",
    jobTitle: "Senior Software Engineer",
    companyName: "TechCorp Inc.",
    candidateName: "John Developer",
    candidateInitials: "JD",
    stage: "interview",
    matchScore: 92,
    bountyAmount: 20000,
    connectorShare: 14000,
    isFromShare: false,
    submittedAt: "2026-01-15",
    lastUpdated: "2026-01-20",
  },
  {
    id: "sub-2",
    jobId: "job-1",
    jobTitle: "Senior Software Engineer",
    companyName: "TechCorp Inc.",
    candidateName: "Sarah Engineer",
    candidateInitials: "SE",
    stage: "screening",
    matchScore: 85,
    bountyAmount: 20000,
    connectorShare: 14000,
    isFromShare: false,
    submittedAt: "2026-01-16",
    lastUpdated: "2026-01-19",
  },
  {
    id: "sub-3",
    jobId: "job-2",
    jobTitle: "Product Manager",
    companyName: "InnovateLabs",
    candidateName: "Mike Product",
    candidateInitials: "MP",
    stage: "pending_approval",
    matchScore: 78,
    bountyAmount: 16000,
    connectorShare: 11200,
    isFromShare: false,
    submittedAt: "2026-01-20",
    lastUpdated: "2026-01-20",
  },
  {
    id: "sub-4",
    jobId: "job-3",
    jobTitle: "Data Scientist",
    companyName: "DataDriven Co.",
    candidateName: "External Candidate",
    candidateInitials: "EC",
    stage: "offer",
    matchScore: 88,
    bountyAmount: 17500,
    connectorShare: 6125, // 35% because from share
    isFromShare: true,
    sharedBy: "LinkedIn Post",
    submittedAt: "2026-01-12",
    lastUpdated: "2026-01-21",
  },
  {
    id: "sub-5",
    jobId: "job-4",
    jobTitle: "UX Designer",
    companyName: "DesignFirst",
    candidateName: "Anna Designer",
    candidateInitials: "AD",
    stage: "offer_accepted",
    matchScore: 95,
    bountyAmount: 12000,
    connectorShare: 8400,
    isFromShare: false,
    submittedAt: "2026-01-05",
    lastUpdated: "2026-01-18",
  },
  {
    id: "sub-6",
    jobId: "job-5",
    jobTitle: "DevOps Engineer",
    companyName: "CloudScale",
    candidateName: "Tom DevOps",
    candidateInitials: "TD",
    stage: "rejected",
    matchScore: 72,
    bountyAmount: 18000,
    connectorShare: 0,
    isFromShare: false,
    submittedAt: "2026-01-10",
    lastUpdated: "2026-01-17",
    requesterFeedback: "Looking for someone with more Kubernetes experience",
  },
];

const STAGES = [
  {
    value: "pending_approval",
    label: "Pending Approval",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    value: "applied",
    label: "Applied",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: "screening",
    label: "Screening",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    value: "interview",
    label: "Interview",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    value: "offer",
    label: "Offer",
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    value: "offer_accepted",
    label: "Offer Accepted",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    value: "rejected",
    label: "Rejected",
    color: "bg-slate-100 text-slate-500 border-slate-200",
  },
];

const getStageInfo = (stage: string) =>
  STAGES.find((s) => s.value === stage) || STAGES[0];

const getStageIcon = (stage: string) => {
  switch (stage) {
    case "pending_approval":
      return <Clock className="h-3 w-3" />;
    case "applied":
      return <User className="h-3 w-3" />;
    case "screening":
      return <Eye className="h-3 w-3" />;
    case "interview":
      return <MessageSquare className="h-3 w-3" />;
    case "offer":
      return <Award className="h-3 w-3" />;
    case "offer_accepted":
      return <CheckCircle className="h-3 w-3" />;
    case "rejected":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export default function ConnectorPipeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedSubmission, setSelectedSubmission] =
    useState<CandidateSubmission | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Filter submissions
  const filteredSubmissions = mockCandidateSubmissions.filter((sub) => {
    const matchesSearch =
      sub.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.candidateName.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending")
      return matchesSearch && sub.stage === "pending_approval";
    if (activeTab === "active")
      return (
        matchesSearch &&
        ["applied", "screening", "interview", "offer"].includes(sub.stage)
      );
    if (activeTab === "completed")
      return (
        matchesSearch && ["offer_accepted", "rejected"].includes(sub.stage)
      );
    return matchesSearch;
  });

  // Sort submissions
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );
      case "bounty":
        return b.connectorShare - a.connectorShare;
      case "match":
        return b.matchScore - a.matchScore;
      default:
        return 0;
    }
  });

  // Stats
  const stats = {
    total: mockCandidateSubmissions.length,
    pendingApproval: mockCandidateSubmissions.filter(
      (s) => s.stage === "pending_approval"
    ).length,
    inPipeline: mockCandidateSubmissions.filter((s) =>
      ["applied", "screening", "interview", "offer"].includes(s.stage)
    ).length,
    offer_accepted: mockCandidateSubmissions.filter(
      (s) => s.stage === "offer_accepted"
    ).length,
    potentialEarnings: mockCandidateSubmissions
      .filter((s) => !["offer_accepted", "rejected"].includes(s.stage))
      .reduce((acc, s) => acc + s.connectorShare, 0),
    earned: mockCandidateSubmissions
      .filter((s) => s.stage === "offer_accepted")
      .reduce((acc, s) => acc + s.connectorShare, 0),
  };

  const handleApproveCandidate = () => {
    toast({
      title: "Candidate approved!",
      description: `${selectedSubmission?.candidateName} has been approved and shared with the requester.`,
    });
    setShowApprovalModal(false);
  };

  const handleDeclineCandidate = () => {
    toast({
      title: "Candidate declined",
      description: "The candidate has been removed from consideration.",
      variant: "destructive",
    });
    setShowApprovalModal(false);
  };

  const SubmissionCard = ({
    submission,
  }: {
    submission: CandidateSubmission;
  }) => {
    const stageInfo = getStageInfo(submission.stage);
    const isPending = submission.stage === "pending_approval";
    const isCompleted = ["offer_accepted", "rejected"].includes(
      submission.stage
    );

    return (
      <Card
        className={cn(
          "group hover:shadow-md transition-all duration-200",
          isPending && "border-amber-200 bg-amber-50/30",
          submission.stage === "offer_accepted" &&
            "border-emerald-200 bg-emerald-50/30"
        )}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white shadow">
                <AvatarFallback
                  className={cn(
                    submission.stage === "offer_accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-cyan-100 text-cyan-700"
                  )}
                >
                  {submission.candidateInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {submission.candidateName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Badge
                    variant="outline"
                    className={cn("gap-1", stageInfo.color)}
                  >
                    {getStageIcon(submission.stage)}
                    {stageInfo.label}
                  </Badge>
                  {submission.isFromShare && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-50 text-purple-600 border-purple-200"
                    >
                      Via Share
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedSubmission(submission);
                    setShowDetailsModal(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Job Info */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="font-medium text-sm text-slate-900">
              {submission.jobTitle}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {submission.companyName}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {submission.matchScore}% match
              </span>
            </div>
          </div>

          {/* Earnings */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-500">Your Potential Earnings</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  submission.stage === "offer_accepted"
                    ? "text-emerald-600"
                    : submission.stage === "rejected"
                      ? "text-slate-400 line-through"
                      : "text-cyan-600"
                )}
              >
                ${formatMoneyWithCommas(submission.connectorShare)}
              </p>
            </div>
            {submission.isFromShare && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Payout Split</p>
                <p className="text-sm font-medium text-purple-600">
                  35% (Shared)
                </p>
              </div>
            )}
          </div>

          {/* Rejection Feedback */}
          {submission.stage === "rejected" && submission.requesterFeedback && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-medium text-red-600 mb-1">
                Feedback from Requester:
              </p>
              <p className="text-sm text-red-700">
                {submission.requesterFeedback}
              </p>
            </div>
          )}

          {/* Stage Progress */}
          {!isCompleted && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{stageInfo.label}</span>
              </div>
              <div className="flex gap-1">
                {STAGES.slice(1, 6).map((stage, index) => {
                  const currentIndex = STAGES.findIndex(
                    (s) => s.value === submission.stage
                  );
                  const stageIndex = index + 1;
                  return (
                    <div
                      key={stage.value}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        stageIndex <= currentIndex
                          ? "bg-cyan-500"
                          : "bg-slate-200"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {new Date(submission.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            {isPending && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setSelectedSubmission(submission);
                    handleDeclineCandidate();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setSelectedSubmission(submission);
                    setShowApprovalModal(true);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </div>
            )}
            {submission.stage === "offer_accepted" && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <Award className="h-3 w-3 mr-1" />
                Earned ${formatMoneyWithCommas(submission.connectorShare)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="h-8 w-8" />
                My Candidate Submissions
              </h1>
              <p className="text-cyan-100 mt-1">
                Track your referred candidates and earnings
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard/recruitment/marketplace")}
              className="bg-white text-cyan-600 hover:bg-cyan-50 shadow-lg"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Browse Jobs
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-cyan-100">Total Submissions</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {stats.pendingApproval}
                </div>
                <div className="text-xs text-cyan-100">Pending Approval</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.inPipeline}</div>
                <div className="text-xs text-cyan-100">In Pipeline</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.offer_accepted}</div>
                <div className="text-xs text-cyan-100">Hired</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  ${formatMoneyWithCommas(stats.potentialEarnings)}
                </div>
                <div className="text-xs text-cyan-100">Potential Earnings</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/20 border-emerald-400/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  ${formatMoneyWithCommas(stats.earned)}
                </div>
                <div className="text-xs text-emerald-100">Total Earned</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Tabs and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="all" className="gap-1">
                All
                <Badge variant="secondary" className="ml-1 text-xs">
                  {mockCandidateSubmissions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                Pending
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs bg-amber-100 text-amber-700"
                >
                  {stats.pendingApproval}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="bounty">Highest Referral Payout</SelectItem>
                <SelectItem value="match">Best Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submissions Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : sortedSubmissions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-cyan-100 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-cyan-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Submissions Found</h3>
            <p className="text-slate-500 mb-6">
              {searchTerm
                ? "No submissions match your search."
                : "You haven't submitted any candidates yet. Browse the job marketplace to get started."}
            </p>
            <Button
              onClick={() => navigate("/dashboard/recruitment/marketplace")}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Browse Job Marketplace
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Candidate Submission</DialogTitle>
            <DialogDescription>
              By approving, {selectedSubmission?.candidateName}'s anonymized
              profile will be shared with the requester.
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-cyan-100 text-cyan-700">
                    {selectedSubmission.candidateInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedSubmission.candidateName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedSubmission.jobTitle}
                  </p>
                </div>
              </div>

              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Match Score</p>
                      <p className="font-bold text-cyan-600">
                        {selectedSubmission.matchScore}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Potential Earnings
                      </p>
                      <p className="font-bold text-cyan-600">
                        $
                        {formatMoneyWithCommas(
                          selectedSubmission.connectorShare
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-sm text-slate-600">
                <p className="font-medium mb-2">What happens next:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>
                    Requester will see an anonymized profile (no personal
                    details)
                  </li>
                  <li>
                    If requester shortlists, you'll be notified to schedule
                    interviews
                  </li>
                  <li>All communication with the candidate goes through you</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApproveCandidate}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve & Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-cyan-100 text-cyan-700 text-lg">
                    {selectedSubmission.candidateInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedSubmission.candidateName}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      getStageInfo(selectedSubmission.stage).color
                    )}
                  >
                    {getStageIcon(selectedSubmission.stage)}
                    {getStageInfo(selectedSubmission.stage).label}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Job</span>
                  <span className="font-medium">
                    {selectedSubmission.jobTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="font-medium">
                    {selectedSubmission.companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Match Score</span>
                  <span className="font-medium text-cyan-600">
                    {selectedSubmission.matchScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Referral Payout</span>
                  <span className="font-medium">
                    ${formatMoneyWithCommas(selectedSubmission.bountyAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Your Share</span>
                  <span className="font-bold text-cyan-600">
                    ${formatMoneyWithCommas(selectedSubmission.connectorShare)}
                    {selectedSubmission.isFromShare && " (35%)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted</span>
                  <span className="font-medium">
                    {new Date(
                      selectedSubmission.submittedAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedSubmission.requesterFeedback && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">
                      Requester Feedback
                    </p>
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                      {selectedSubmission.requesterFeedback}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
