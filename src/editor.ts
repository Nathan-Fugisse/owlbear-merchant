import type { EditTarget, InventoryEntry, ServiceEntry, StockEntry } from "./types";

export type Draft = StockEntry | ServiceEntry | InventoryEntry | null;

let target: EditTarget = null;
let draft: Draft = null;

export function getTarget(): EditTarget {
  return target;
}

export function getDraft(): Draft {
  return draft;
}

export function setEditor(nextTarget: EditTarget, nextDraft: Draft): void {
  target = nextTarget;
  draft = nextDraft;
}

export function clearEditor(): void {
  target = null;
  draft = null;
}

export function updateDraft(patch: Record<string, unknown>): void {
  if (!draft) return;
  draft = { ...draft, ...patch } as Draft;
}

export function isStockDraft(value: Draft): value is StockEntry {
  return !!value && "quantity" in value && "price" in value && "rarity" in value;
}
