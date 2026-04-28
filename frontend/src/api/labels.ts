import { apiDelete, apiGet, apiPost } from "@/api/client";
import {
  guestAttachLabel,
  guestCreateLabel,
  guestDetachLabel,
  guestGetLabels,
  isGuestMode,
} from "@/guest/store";

export interface Label {
  id: number;
  name: string;
  color: string;
}

export function getLabels(): Promise<Label[]> {
  if (isGuestMode()) return Promise.resolve(guestGetLabels());
  return apiGet<Label[]>("/labels");
}

export function createLabel(name: string, color: string): Promise<Label> {
  if (isGuestMode()) return Promise.resolve(guestCreateLabel(name, color));
  return apiPost<Label>("/labels", { name, color });
}

export function attachLabel(poringId: number, labelId: number): Promise<Label> {
  if (isGuestMode()) return Promise.resolve(guestAttachLabel(poringId, labelId));
  return apiPost<Label>(`/porings/${poringId}/labels/${labelId}`);
}

export function detachLabel(poringId: number, labelId: number): Promise<void> {
  if (isGuestMode()) { guestDetachLabel(poringId, labelId); return Promise.resolve(); }
  return apiDelete(`/porings/${poringId}/labels/${labelId}`);
}
