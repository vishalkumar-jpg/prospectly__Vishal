export interface FeedbackMediaItem {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileType: string;
  size: number;
}

export interface FeedbackRequest {
  id: string;
  userId: string;
  type: "bug" | "feature" | "ui_ux" | "general";
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "under_review" | "in_progress" | "completed" | "closed";
  title: string;
  description: string;
  currentPage?: string | null;
  createdAt: string;
  updatedAt: string;
  media?: FeedbackMediaItem[];
}

export interface FeedbackMedia {
  module: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileType: "image" | "video" | "document";
  size: number;
}
