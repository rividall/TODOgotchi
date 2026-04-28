import { apiDelete, apiGet, apiPost } from "@/api/client";

export interface FeedbackItem {
  id: number;
  message: string;
  created_at: string;
}

export interface FeedbackCreate {
  message: string;
  email?: string;
}

export function getFeedback(): Promise<FeedbackItem[]> {
  return apiGet<FeedbackItem[]>("/feedback", { authenticated: false });
}

export function submitFeedback(payload: FeedbackCreate): Promise<FeedbackItem> {
  return apiPost<FeedbackItem>("/feedback", payload, { authenticated: false });
}

export interface FeedbackAdminItem {
  id: number;
  message: string;
  email: string | null;
  created_at: string;
}

export function getAdminFeedback(): Promise<FeedbackAdminItem[]> {
  return apiGet<FeedbackAdminItem[]>("/feedback/admin");
}

export function deleteFeedback(id: number): Promise<void> {
  return apiDelete(`/feedback/${id}`);
}
