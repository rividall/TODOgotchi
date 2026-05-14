import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/client";
import type { ChecklistItem } from "@/api/checklist";
import type { Label } from "@/api/labels";
import {
  guestActOnPoring,
  guestCompletePoring,
  guestCreatePoring,
  guestDeletePoring,
  guestGetPoring,
  guestGetPorings,
  guestUpdatePoring,
  isGuestMode,
} from "@/guest/store";

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
  if (isGuestMode()) return Promise.resolve(guestGetPorings());
  return apiGet<Poring[]>("/porings");
}

export function createPoring(payload: PoringCreate): Promise<Poring> {
  if (isGuestMode()) return Promise.resolve(guestCreatePoring(payload.title, payload.description));
  return apiPost<Poring>("/porings", payload);
}

export function getPoring(id: number): Promise<Poring> {
  if (isGuestMode()) return Promise.resolve(guestGetPoring(id));
  return apiGet<Poring>(`/porings/${id}`);
}

export function updatePoring(id: number, patch: PoringPatch): Promise<Poring> {
  if (isGuestMode()) return Promise.resolve(guestUpdatePoring(id, patch));
  return apiPatch<Poring>(`/porings/${id}`, patch);
}

export function deletePoring(id: number): Promise<void> {
  if (isGuestMode()) { guestDeletePoring(id); return Promise.resolve(); }
  return apiDelete(`/porings/${id}`);
}

export function actOnPoring(id: number, actionType: ActionType): Promise<Poring> {
  if (isGuestMode()) return Promise.resolve(guestActOnPoring(id, actionType));
  return apiPost<Poring>(`/porings/${id}/act`, { action_type: actionType });
}

export function completePoring(id: number): Promise<Poring> {
  if (isGuestMode()) return Promise.resolve(guestCompletePoring(id));
  return apiPost<Poring>(`/porings/${id}/complete`, {});
}
