/**
 * Trust Score API Module
 * Handles trust score, rules, history, and user feedback
 */

import { request } from "./core";
import type { AnyType } from "../../types/common";

export const trustScoreApi = {
  getMyScore: () =>
    request<{ trustScore: number; lastUpdated: string }>("/trust-score/me"),

  getMyRules: () =>
    request<{
      earned: Array<{
        ruleId: string;
        slug: string;
        name: string;
        description: string | null;
        points: number;
        priority: number;
        actionType: string;
        earnedAt: string;
        evidence: AnyType;
        configParams?: Record<string, unknown>;
        progressInfo?: {
          currentPercentage: number;
          requiredPercentage: number;
          totalResponses: number;
          qualifyingResponses: number;
          status: "earned" | "close" | "needs_improvement";
          message: string;
        };
        history?: Array<{
          triggeredAt: string;
          actionType: string;
          pointsChange: number;
          evidence: Record<string, unknown> | null;
        }>;
      }>;
      pending: Array<{
        ruleId: string;
        slug: string;
        name: string;
        description: string | null;
        points: number;
        priority: number;
        actionType: string;
        actionUrl?: string;
        actionLabel?: string;
        configParams?: Record<string, unknown>;
        progressInfo?: {
          currentPercentage: number;
          requiredPercentage: number;
          totalResponses: number;
          qualifyingResponses: number;
          status: "earned" | "close" | "needs_improvement";
          message: string;
        };
        history?: Array<{
          triggeredAt: string;
          actionType: string;
          pointsChange: number;
          evidence: Record<string, unknown> | null;
        }>;
      }>;
      deductions: Array<{
        ruleId: string;
        slug: string;
        name: string;
        description: string | null;
        points: number;
        priority: number;
        actionType: string;
        triggeredAt?: string;
        evidence: AnyType;
        configParams?: Record<string, unknown>;
        progressInfo?: {
          currentPercentage: number;
          requiredPercentage: number;
          totalResponses: number;
          qualifyingResponses: number;
          status: "earned" | "close" | "needs_improvement";
          message: string;
        };
        history?: Array<{
          triggeredAt: string;
          actionType: string;
          pointsChange: number;
          evidence: Record<string, unknown> | null;
        }>;
      }>;
    }>("/trust-score/me/rules"),

  getMyHistory: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", limit.toString());
    if (offset !== undefined) params.append("offset", offset.toString());
    const query = params.toString();
    return request<{
      history: Array<{
        id: number;
        ruleId: number;
        ruleName: string;
        ruleSlug: string;
        previousScore: number;
        newScore: number;
        pointsChange: number;
        actionType: string;
        evidence: AnyType;
        triggeredAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`/trust-score/me/history${query ? `?${query}` : ""}`);
  },
};

export const feedbackApi = {
  getMyFeedback: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", limit.toString());
    if (offset !== undefined) params.append("offset", offset.toString());
    const query = params.toString();
    return request<{
      feedbacks: Array<{
        id: string;
        rating: number;
        feedbackText: string | null;
        feedbackFromUser: {
          id: string;
          fullName: string | null;
          company: string | null;
          profilePhotoUrl?: string | null;
        };
        introductionRequest: {
          id: string;
          contactName: string;
        };
        createdAt: string;
      }>;
      stats: {
        averageRating: number;
        totalCount: number;
        ratingDistribution: { [rating: number]: number };
      };
    }>(`/trust-score/feedback/me${query ? `?${query}` : ""}`);
  },

  getMyStats: () =>
    request<{
      averageRating: number;
      totalCount: number;
      ratingDistribution: { [rating: number]: number };
    }>("/trust-score/feedback/me/stats"),
};
