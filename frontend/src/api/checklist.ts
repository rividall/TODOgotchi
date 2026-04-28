import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";
import {
  guestAddChecklistItem,
  guestDeleteChecklistItem,
  guestUpdateChecklistItem,
  isGuestMode,
} from "@/guest/store";

export interface ChecklistItem {
  id: number;
  poring_id: number;
  text: string;
  completed: boolean;
  order: number;
}

export function getChecklist(poringId: number): Promise<ChecklistItem[]> {
  return apiGet<ChecklistItem[]>(`/porings/${poringId}/checklist`);
}

export function addChecklistItem(poringId: number, text: string): Promise<ChecklistItem> {
  if (isGuestMode()) return Promise.resolve(guestAddChecklistItem(poringId, text));
  return apiPost<ChecklistItem>(`/porings/${poringId}/checklist`, { text });
}

export function updateChecklistItem(
  poringId: number,
  itemId: number,
  patch: { text?: string; completed?: boolean; order?: number },
): Promise<ChecklistItem> {
  if (isGuestMode()) return Promise.resolve(guestUpdateChecklistItem(poringId, itemId, patch));
  return apiPatch<ChecklistItem>(`/porings/${poringId}/checklist/${itemId}`, patch);
}

export function deleteChecklistItem(poringId: number, itemId: number): Promise<void> {
  if (isGuestMode()) { guestDeleteChecklistItem(poringId, itemId); return Promise.resolve(); }
  return apiDelete(`/porings/${poringId}/checklist/${itemId}`);
}
