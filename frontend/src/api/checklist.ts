import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";

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

export function addChecklistItem(
  poringId: number,
  text: string,
): Promise<ChecklistItem> {
  return apiPost<ChecklistItem>(`/porings/${poringId}/checklist`, { text });
}

export function updateChecklistItem(
  poringId: number,
  itemId: number,
  patch: { text?: string; completed?: boolean; order?: number },
): Promise<ChecklistItem> {
  return apiPatch<ChecklistItem>(`/porings/${poringId}/checklist/${itemId}`, patch);
}

export function deleteChecklistItem(poringId: number, itemId: number): Promise<void> {
  return apiDelete(`/porings/${poringId}/checklist/${itemId}`);
}
