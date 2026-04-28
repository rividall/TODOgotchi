/**
 * In-memory guest store. Mirrors the backend's XP rules so interactions feel
 * real, but nothing is persisted. All API modules check isGuestMode() first.
 */

import type { ChecklistItem } from "@/api/checklist";
import type { Label } from "@/api/labels";
import type { ActionType, GrowthTier, Poring } from "@/api/porings";

// ─── XP rules (must match backend xp_service.py) ─────────────────────────────

const XP_DESC = 2;
const XP_CHECKLIST_ADD = 3;
const XP_CHECKLIST_COMPLETE = 5;
const XP_LABEL_ATTACH = 3;

function computeTier(xp: number): GrowthTier {
  if (xp >= 60) return "ripe";
  if (xp >= 30) return "chubby";
  if (xp >= 10) return "happy";
  return "seed";
}

// ─── Guest mode flag ──────────────────────────────────────────────────────────

let _guestMode = false;
export function isGuestMode(): boolean { return _guestMode; }
export function setGuestMode(active: boolean): void { _guestMode = active; }

// ─── Preset data ──────────────────────────────────────────────────────────────
// IDs 0–3 map to dino variants vita / doux / mort / tard (id % 4).
// Sourced from the real DB (last 4 created porings, 2026-04-28).

const INITIAL_LABELS: Label[] = [
  { id: 0, name: "Work",     color: "#F43F5E" },
  { id: 1, name: "software", color: "#F43F5E" },
  { id: 2, name: "family",   color: "#F32CE8" },
  { id: 3, name: "Home",     color: "#F43F5E" },
];

const INITIAL_PORINGS: Poring[] = [
  {
    id: 0,
    title: "Read me!",
    description: "Hey there stranger!\nThis is a hobby project based on ideacritters.com by @koysun.\nAs part of my full-stack development self-teaching sprint, I wanted to expand on the original by adding more data fields, modes, animations, and user/guest accounts to practice back and front end architecture, design and development.\nThis Critter is fully levelled, which you can tell from it's aura. Full level unlocks more interactions.\n[COMING] Feel free to drop Feedback on the comments!",
    xp: 72,
    growth_tier: "ripe",
    status: "alive",
    action_type: null,
    created_at: "2026-04-28T09:58:54Z",
    updated_at: "2026-04-28T09:58:54Z",
    checklist: [
      { id: 0, poring_id: 0, text: "Scaffold the app's backend. Py, FASTAPI",       completed: true, order: 0 },
      { id: 1, poring_id: 0, text: "Create react + tsx frontend",                    completed: true, order: 2 },
      { id: 2, poring_id: 0, text: "Create dbs SQLAlchemy",                          completed: true, order: 3 },
      { id: 3, poring_id: 0, text: "Several JSX libraries to load sprites and animate them", completed: true, order: 4 },
      { id: 4, poring_id: 0, text: "Deploy to homeLab, connect cloudflare",          completed: true, order: 5 },
      { id: 5, poring_id: 0, text: "Write the Dino readme",                          completed: true, order: 6 },
      { id: 6, poring_id: 0, text: "Create form for feedback",                       completed: true, order: 7 },
    ],
    labels: [
      { id: 0, name: "Work",     color: "#F43F5E" },
      { id: 1, name: "software", color: "#F43F5E" },
    ],
  },
  {
    id: 1,
    title: "Call Mum",
    description: "Need to call Mum for a family update!",
    xp: 20,
    growth_tier: "happy",
    status: "alive",
    action_type: null,
    created_at: "2026-04-28T09:55:25Z",
    updated_at: "2026-04-28T09:55:25Z",
    checklist: [
      { id: 7,  poring_id: 1, text: "Find a good date/time",              completed: false, order: 0 },
      { id: 8,  poring_id: 1, text: "Ask her about Papa",                 completed: false, order: 1 },
      { id: 9,  poring_id: 1, text: "Tell her about the million euro app", completed: false, order: 2 },
      { id: 10, poring_id: 1, text: "Cry cause she doesn't like it",       completed: false, order: 3 },
    ],
    labels: [{ id: 2, name: "family", color: "#F32CE8" }],
  },
  {
    id: 2,
    title: "Create a pretty app!",
    description: "I need an idea for an app, and then i want to create it!",
    xp: 14,
    growth_tier: "happy",
    status: "alive",
    action_type: null,
    created_at: "2026-04-28T09:53:45Z",
    updated_at: "2026-04-28T09:53:45Z",
    checklist: [
      { id: 11, poring_id: 2, text: "Come up with million Euro idea", completed: false, order: 0 },
      { id: 12, poring_id: 2, text: "Develop idea",                   completed: false, order: 1 },
      { id: 13, poring_id: 2, text: "Make million euro!",             completed: false, order: 2 },
    ],
    labels: [{ id: 0, name: "Work", color: "#F43F5E" }],
  },
  {
    id: 3,
    title: "Take out the thrash",
    description: "Need to take out the trash today!",
    xp: 14,
    growth_tier: "happy",
    status: "alive",
    action_type: null,
    created_at: "2026-04-28T09:52:45Z",
    updated_at: "2026-04-28T09:52:45Z",
    checklist: [
      { id: 14, poring_id: 3, text: "Separate recycling",  completed: false, order: 0 },
      { id: 15, poring_id: 3, text: "Bag everyhting",       completed: false, order: 1 },
      { id: 16, poring_id: 3, text: "Bring it to the bin",  completed: false, order: 2 },
    ],
    labels: [{ id: 3, name: "Home", color: "#F43F5E" }],
  },
];

function clonePresets(): Poring[] {
  return INITIAL_PORINGS.map((p) => ({
    ...p,
    checklist: p.checklist.map((i) => ({ ...i })),
    labels: p.labels.map((l) => ({ ...l })),
  }));
}

// ─── Mutable state ────────────────────────────────────────────────────────────

let _porings: Poring[] = clonePresets();
let _labels: Label[] = [...INITIAL_LABELS];
let _nextPoringId = 4;
let _nextItemId = 17;
let _nextLabelId = 4;

export function resetGuestStore(): void {
  _porings = clonePresets();
  _labels = INITIAL_LABELS.map((l) => ({ ...l }));
  _nextPoringId = 4;
  _nextItemId = 17;
  _nextLabelId = 4;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function awardXp(poringId: number, amount: number): void {
  const p = _porings.find((p) => p.id === poringId);
  if (!p || p.status === "completed") return;
  p.xp += amount;
  p.growth_tier = computeTier(p.xp);
  p.updated_at = new Date().toISOString();
}

function snapshot(p: Poring): Poring {
  return { ...p, checklist: [...p.checklist], labels: [...p.labels] };
}

// ─── Poring operations ────────────────────────────────────────────────────────

export function guestGetPorings(): Poring[] {
  return _porings.map(snapshot);
}

export function guestGetPoring(id: number): Poring {
  const p = _porings.find((p) => p.id === id);
  if (!p) throw new Error(`Guest poring ${id} not found`);
  return snapshot(p);
}

export function guestCreatePoring(title: string, description?: string | null): Poring {
  const now = new Date().toISOString();
  const p: Poring = {
    id: _nextPoringId++,
    title,
    description: description ?? null,
    xp: 0,
    growth_tier: "seed",
    status: "alive",
    action_type: null,
    created_at: now,
    updated_at: now,
    checklist: [],
    labels: [],
  };
  _porings = [..._porings, p];
  return snapshot(p);
}

export function guestUpdatePoring(
  id: number,
  patch: { title?: string; description?: string | null },
): Poring {
  const p = _porings.find((p) => p.id === id);
  if (!p) throw new Error(`Guest poring ${id} not found`);
  const descChanged = "description" in patch && patch.description !== p.description;
  if (patch.title !== undefined) p.title = patch.title;
  if ("description" in patch) p.description = patch.description ?? null;
  p.updated_at = new Date().toISOString();
  if (descChanged) awardXp(id, XP_DESC);
  return snapshot(p);
}

export function guestDeletePoring(id: number): void {
  _porings = _porings.filter((p) => p.id !== id);
}

export function guestActOnPoring(id: number, actionType: ActionType): Poring {
  const p = _porings.find((p) => p.id === id);
  if (!p) throw new Error(`Guest poring ${id} not found`);
  if (p.xp < 60) throw new Error("Poring is not ripe yet");
  p.status = "completed";
  p.action_type = actionType;
  p.updated_at = new Date().toISOString();
  return snapshot(p);
}

// ─── Checklist operations ─────────────────────────────────────────────────────

export function guestAddChecklistItem(poringId: number, text: string): ChecklistItem {
  const p = _porings.find((p) => p.id === poringId);
  if (!p) throw new Error(`Guest poring ${poringId} not found`);
  const item: ChecklistItem = {
    id: _nextItemId++,
    poring_id: poringId,
    text,
    completed: false,
    order: p.checklist.length,
  };
  p.checklist = [...p.checklist, item];
  awardXp(poringId, XP_CHECKLIST_ADD);
  return { ...item };
}

export function guestUpdateChecklistItem(
  poringId: number,
  itemId: number,
  patch: { text?: string; completed?: boolean; order?: number },
): ChecklistItem {
  const p = _porings.find((p) => p.id === poringId);
  if (!p) throw new Error(`Guest poring ${poringId} not found`);
  const item = p.checklist.find((i) => i.id === itemId);
  if (!item) throw new Error(`Checklist item ${itemId} not found`);
  const wasCompleted = item.completed;
  Object.assign(item, patch);
  if (!wasCompleted && item.completed) awardXp(poringId, XP_CHECKLIST_COMPLETE);
  return { ...item };
}

export function guestDeleteChecklistItem(poringId: number, itemId: number): void {
  const p = _porings.find((p) => p.id === poringId);
  if (!p) return;
  p.checklist = p.checklist.filter((i) => i.id !== itemId);
}

// ─── Label operations ─────────────────────────────────────────────────────────

export function guestGetLabels(): Label[] {
  return _labels.map((l) => ({ ...l }));
}

export function guestCreateLabel(name: string, color: string): Label {
  const label: Label = { id: _nextLabelId++, name, color };
  _labels = [..._labels, label];
  return { ...label };
}

export function guestAttachLabel(poringId: number, labelId: number): Label {
  const p = _porings.find((p) => p.id === poringId);
  if (!p) throw new Error(`Guest poring ${poringId} not found`);
  const label = _labels.find((l) => l.id === labelId);
  if (!label) throw new Error(`Label ${labelId} not found`);
  if (!p.labels.some((l) => l.id === labelId)) {
    p.labels = [...p.labels, { ...label }];
    awardXp(poringId, XP_LABEL_ATTACH);
  }
  return { ...label };
}

export function guestDetachLabel(poringId: number, labelId: number): void {
  const p = _porings.find((p) => p.id === poringId);
  if (!p) return;
  p.labels = p.labels.filter((l) => l.id !== labelId);
}
