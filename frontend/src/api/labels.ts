import { apiDelete, apiGet, apiPost } from "@/api/client";

export interface Label {
  id: number;
  name: string;
  color: string;
}

export function getLabels(): Promise<Label[]> {
  return apiGet<Label[]>("/labels");
}

export function createLabel(name: string, color: string): Promise<Label> {
  return apiPost<Label>("/labels", { name, color });
}

export function attachLabel(poringId: number, labelId: number): Promise<Label> {
  return apiPost<Label>(`/porings/${poringId}/labels/${labelId}`);
}

export function detachLabel(poringId: number, labelId: number): Promise<void> {
  return apiDelete(`/porings/${poringId}/labels/${labelId}`);
}
