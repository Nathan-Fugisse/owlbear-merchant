import OBR, { isImage, type Item, type Metadata } from "@owlbear-rodeo/sdk";
import { MAX_LOG_ENTRIES, METADATA, TOKEN_LAYERS } from "./constants";
import {
  defaultSettings,
  defaultShop,
  sanitizeOrders,
  sanitizeSettings,
  sanitizeShop,
  sanitizeWallet,
} from "./defaults";
import type {
  Lang,
  LogEntry,
  Order,
  Role,
  Route,
  Settings,
  ShopData,
  ShopTab,
  Toast,
  ToastKind,
  Wallet,
} from "./types";
import { sanitizeStock, sanitizeServices } from "./defaults";
import { uid } from "./util";

const LANG_KEY = "owlbear-merchant:lang";

export type TokenInfo = {
  id: string;
  name: string;
  image: string;
  layer: string;
  owner: string;
  shop?: ShopData;
};

export type AppState = {
  ready: boolean;
  sceneReady: boolean;
  role: Role;
  playerId: string;
  playerName: string;
  color: string;
  lang: Lang;
  settings: Settings;
  wallets: Record<string, Wallet>;
  orders: Order[];
  tokens: TokenInfo[];
  route: Route;
  walletViewId: string;
  search: string;
  toast?: Toast;
};

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
  } catch {
    /* localStorage pode estar bloqueado */
  }
  return typeof navigator !== "undefined" && navigator.language?.startsWith("pt")
    ? "pt-BR"
    : "en";
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignora */
  }
}

export const state: AppState = {
  ready: false,
  sceneReady: false,
  role: "PLAYER",
  playerId: "",
  playerName: "",
  color: "#ffffff",
  lang: loadLang(),
  settings: defaultSettings(loadLang()),
  wallets: {},
  orders: [],
  tokens: [],
  route: { name: "home", tab: "shops" },
  walletViewId: "",
  search: "",
};

let renderListener: (() => void) | null = null;

export function onRender(listener: () => void): void {
  renderListener = listener;
}

export function requestRender(): void {
  renderListener?.();
}

export function setState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  requestRender();
}

let toastId = 0;
let toastTimer: number | undefined;

export function toast(text: string, kind: ToastKind = "info"): void {
  toastId += 1;
  const id = toastId;
  state.toast = { id, text, kind };
  requestRender();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (state.toast?.id === id) {
      state.toast = undefined;
      requestRender();
    }
  }, 3500);
}

/* -------------------------------------------------------------------------- */
/* Leitura / escrita                                                          */
/* -------------------------------------------------------------------------- */

function applyRoomMetadata(metadata: Metadata): void {
  state.settings = sanitizeSettings(metadata[METADATA.settings], state.lang);
  const walletsRaw = (metadata[METADATA.wallets] ?? {}) as Record<string, unknown>;
  const wallets: Record<string, Wallet> = {};
  for (const [id, raw] of Object.entries(walletsRaw)) {
    wallets[id] = sanitizeWallet(
      raw,
      id,
      `Player ${id.slice(0, 4)}`,
      "#8b8b9e",
      state.settings.currencies,
    );
  }
  state.wallets = wallets;
  state.orders = sanitizeOrders(metadata[METADATA.orders], state.settings.currencies);
}

let tokensSignature = "";
let partySignature = "";

/**
 * Evita re-renderizar a interface a cada movimento de token: so atualizamos
 * quando algo que realmente exibimos muda.
 */
function signatureOf(items: Item[]): string {
  let signature = "";
  for (const item of items) {
    if (!isImage(item)) continue;
    if (!TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    signature += `|${item.id}:${item.name ?? ""}:${item.image?.url ?? ""}:${JSON.stringify(
      item.metadata[METADATA.shop] ?? null,
    )}`;
  }
  return signature;
}

function setTokens(items: Item[]): void {
  const signature = signatureOf(items);
  if (signature === tokensSignature) return;
  tokensSignature = signature;

  const tokens: TokenInfo[] = [];
  for (const item of items) {
    if (!isImage(item)) continue;
    if (!TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    const raw = item.metadata[METADATA.shop];
    tokens.push({
      id: item.id,
      name: item.name || "Token",
      image: item.image?.url ?? "",
      layer: item.layer,
      owner: item.createdUserId ?? "",
      shop: raw ? sanitizeShop(raw, state.settings) : undefined,
    });
  }
  tokens.sort((a, b) => a.name.localeCompare(b.name));
  state.tokens = tokens;
}

export async function refreshTokens(): Promise<void> {
  const ready = await OBR.scene.isReady();
  state.sceneReady = ready;
  if (!ready) {
    state.tokens = [];
    tokensSignature = "";
    return;
  }
  const items = await OBR.scene.items.getItems();
  setTokens(items);
}

export function getToken(itemId: string): TokenInfo | undefined {
  return state.tokens.find((token) => token.id === itemId);
}

export function getShop(itemId: string): ShopData | undefined {
  return getToken(itemId)?.shop;
}

export function myWallet(): Wallet {
  const existing = state.wallets[state.playerId];
  if (existing) return existing;
  return sanitizeWallet(
    undefined,
    state.playerId,
    state.playerName,
    state.color,
    state.settings.currencies,
  );
}

export function viewedWallet(): Wallet {
  const id = state.walletViewId && state.wallets[state.walletViewId]
    ? state.walletViewId
    : state.playerId;
  return state.wallets[id] ?? myWallet();
}

/* -------------------------------------------------------------------------- */
/* Escritas                                                                   */
/* -------------------------------------------------------------------------- */

export async function saveSettings(next: Settings): Promise<void> {
  state.settings = next;
  requestRender();
  await OBR.room.setMetadata({ [METADATA.settings]: next });
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await saveSettings({ ...state.settings, ...patch });
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  const next = {
    ...state.wallets,
    [wallet.id]: { ...wallet, updatedAt: Date.now() },
  };
  state.wallets = next;
  requestRender();
  await OBR.room.setMetadata({ [METADATA.wallets]: next });
}

export async function saveWallets(next: Record<string, Wallet>): Promise<void> {
  state.wallets = next;
  requestRender();
  await OBR.room.setMetadata({ [METADATA.wallets]: next });
}

export async function saveOrders(next: Order[]): Promise<void> {
  state.orders = next;
  requestRender();
  await OBR.room.setMetadata({ [METADATA.orders]: next });
}

export async function updateShop(
  itemId: string,
  updater: (shop: ShopData) => ShopData | void,
): Promise<boolean> {
  const current = getShop(itemId);
  if (!current) return false;
  const draft: ShopData = JSON.parse(JSON.stringify(current));
  const next = updater(draft) ?? draft;
  next.updatedAt = Date.now();
  try {
    await OBR.scene.items.updateItems(
      (item) => item.id === itemId,
      (items) => {
        for (const item of items) {
          (item.metadata as Record<string, unknown>)[METADATA.shop] = next;
        }
      },
    );
    return true;
  } catch (error) {
    console.error("[owlbear-merchant] falha ao atualizar a loja:", error);
    return false;
  }
}

export async function createShop(itemId: string, tokenName: string): Promise<boolean> {
  // Se o token ja tem uma loja (mesmo desativada) apenas reativamos, sem perder dados
  const existing = getShop(itemId);
  if (existing) {
    return updateShop(itemId, (shop) => {
      shop.enabled = true;
      if (!shop.name) shop.name = tokenName;
    });
  }
  const shop = sanitizeShop(
    { ...defaultShopFor(tokenName), enabled: true },
    state.settings,
  );
  try {
    await OBR.scene.items.updateItems(
      (item) => item.id === itemId,
      (items) => {
        for (const item of items) {
          (item.metadata as Record<string, unknown>)[METADATA.shop] = shop;
        }
      },
    );
    return true;
  } catch (error) {
    console.error("[owlbear-merchant] falha ao criar a loja:", error);
    return false;
  }
}

function defaultShopFor(tokenName: string): ShopData {
  return { ...defaultShop(state.settings, tokenName), enabled: true };
}

export async function deleteShop(itemId: string): Promise<boolean> {
  try {
    await OBR.scene.items.updateItems(
      (item) => item.id === itemId,
      (items) => {
        for (const item of items) {
          delete (item.metadata as Record<string, unknown>)[METADATA.shop];
        }
      },
    );
    return true;
  } catch (error) {
    console.error("[owlbear-merchant] falha ao remover a loja:", error);
    return false;
  }
}

export function addLog(entry: Omit<LogEntry, "id" | "at">): void {
  const log: LogEntry[] = [
    { id: uid("log"), at: Date.now(), ...entry },
    ...state.settings.log,
  ].slice(0, MAX_LOG_ENTRIES);
  void saveSettings({ ...state.settings, log });
}

/** Tamanho aproximado (em bytes) do que guardamos no metadata da sala. */
export function metadataSize(): number {
  return JSON.stringify({
    [METADATA.settings]: state.settings,
    [METADATA.wallets]: state.wallets,
    [METADATA.orders]: state.orders,
  }).length;
}

/* -------------------------------------------------------------------------- */
/* Navegacao                                                                  */
/* -------------------------------------------------------------------------- */

export function navigate(route: Route): void {
  state.route = route;
  const base = import.meta.env.BASE_URL;
  const url =
    route.name === "shop"
      ? `${base}index.html?shop=${encodeURIComponent(route.itemId)}&tab=${route.tab}`
      : `${base}index.html`;
  try {
    window.history.replaceState(null, "", url);
  } catch {
    /* ignora */
  }
  requestRender();
}

export function goHome(tab: "shops" | "wallet" | "orders" | "settings" = "shops"): void {
  navigate({ name: "home", tab });
}

export function openShop(itemId: string, tab: ShopTab = "buy"): void {
  navigate({ name: "shop", itemId, tab });
}

function parseRoute(): void {
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get("shop");
  if (shopId) {
    const tab = params.get("tab") as ShopTab | null;
    const allowed: ShopTab[] = ["buy", "sell", "services", "manage"];
    state.route = {
      name: "shop",
      itemId: shopId,
      tab: tab && allowed.includes(tab) ? tab : "buy",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                  */
/* -------------------------------------------------------------------------- */

async function ensureMyWallet(): Promise<void> {
  const existing = state.wallets[state.playerId];
  const fresh = sanitizeWallet(
    existing,
    state.playerId,
    state.playerName,
    state.color,
    state.settings.currencies,
  );
  const needsUpdate =
    !existing ||
    existing.name !== fresh.name ||
    existing.color !== fresh.color ||
    Object.keys(existing.money ?? {}).length !==
      Object.keys(fresh.money).length;
  if (needsUpdate) await saveWallet(fresh);
}

export function initApp(): void {
  OBR.onReady(async () => {
    const [role, id, name, color] = await Promise.all([
      OBR.player.getRole(),
      OBR.player.getId(),
      OBR.player.getName(),
      OBR.player.getColor(),
    ]);
    state.role = role;
    state.playerId = id;
    state.playerName = name;
    state.color = color;
    state.walletViewId = id;

    applyRoomMetadata(await OBR.room.getMetadata());
    parseRoute();
    await refreshTokens();
    await ensureMyWallet();

    state.ready = true;
    requestRender();

    OBR.room.onMetadataChange((metadata) => {
      applyRoomMetadata(metadata);
      requestRender();
    });

    OBR.scene.items.onChange((items) => {
      setTokens(items);
      requestRender();
    });

    OBR.scene.onReadyChange((ready) => {
      state.sceneReady = ready;
      requestRender();
      void refreshTokens().then(requestRender);
    });

    OBR.party.onChange((players) => {
      const signature = players
        .map((player) => `${player.id}:${player.role}:${player.color}`)
        .join("|");
      if (signature === partySignature) return;
      partySignature = signature;
      requestRender();
    });

    OBR.player.onChange((player) => {
      state.role = player.role;
      state.color = player.color;
      requestRender();
    });
  });
}

/** Re-sanitiza listas quando as moedas mudam (usado na limpeza de itens orfaos). */
export function resanitizeShopData(shop: ShopData): ShopData {
  return {
    ...shop,
    stock: sanitizeStock(shop.stock, state.settings.currencies),
    services: sanitizeServices(shop.services, state.settings.currencies),
  };
}
