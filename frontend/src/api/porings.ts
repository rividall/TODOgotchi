import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";
import type { ChecklistItem } from "@/api/checklist";
import type { Label } from "@/api/labels";

export type GrowthTier = "seed" | "happy" | "chubby" | "ripe";
export type PoringStatus = "alive" | "completed";
export type ActionType = "shipped" | "booked" | "bought" | "done" | "abandoned";

export interface Poring {
  id: number;
  title: string;
  description: string | null;
  xp: number;
  growth_tier: GrowthTier;
  status: PoringStatus;
  action_type: ActionType | null;
  checklist: ChecklistItem[];
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface PoringCreate {
  title: string;
  description?: string | null;
}

export interface PoringPatch {
  title?: string;
  description?: string | null;
}

export function getPorings(): Promise<Poring[]> {
  return apiGet<Poring[]>("/porings");
}

export function createPoring(payload: PoringCreate): Promise<Poring> {
  return apiPost<Poring>("/porings", payload);
}

export function getPoring(id: number): Promise<Poring> {
  return apiGet<Poring>(`/porings/${id}`);
}

export function updatePoring(id: number, patch: PoringPatch): Promise<Poring> {
  return apiPatch<Poring>(`/porings/${id}`, patch);
}

export function deletePoring(id: number): Promise<void> {
  return apiDelete(`/porings/${id}`);
}

export function actOnPoring(id: number, actionType: ActionType): Promise<Poring> {
  return apiPost<Poring>(`/porings/${id}/act`, { action_type: actionType });
}
