export interface FeedbackRequest {
  id: string;
  type: "bug" | "feature" | "general" | "ui_ux";
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "in_review" | "in_progress" | "resolved" | "closed";
  title: string;
  description: string;
  currentPage: string;
  browserInfo: string;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  internalNotes: string[];
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
}

export interface FeedbackNote {
  id: string;
  feedbackId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export type FeedbackType = FeedbackRequest["type"];
export type FeedbackPriority = FeedbackRequest["priority"];
export type FeedbackStatus = FeedbackRequest["status"];
