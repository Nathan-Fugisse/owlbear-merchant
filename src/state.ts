import OBR, { isImage, type Item } from "@owlbear-rodeo/sdk";
import { MAX_LOG_ENTRIES, TOKEN_LAYERS } from "./constants";
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
import { uid } from "./util";

const LANG_KEY = "owlbear-merchant:lang";
const DATA_PREFIX = "owlbear-merchant:data:";

type LocalData = {
  version: number;
  settings: Settings;
  wallets: Record<string, Wallet>;
  orders: Order[];
  shops: Record<string, ShopData>;
};

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
  shops: Record<string, ShopData>;
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
  shops: {},
  tokens: [],
  route: { name: "home", tab: "shops" },
  walletViewId: "",
  search: "",
};

let roomStorageKey = "";
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

function storageKey(roomId: string): string {
  return `${DATA_PREFIX}${roomId}`;
}

function emptyLocalData(): LocalData {
  return {
    version: 1,
    settings: defaultSettings(state.lang),
    wallets: {},
    orders: [],
    shops: {},
  };
}

function loadLocalData(roomId: string): void {
  roomStorageKey = storageKey(roomId);
  let data = emptyLocalData();
  try {
    const raw = localStorage.getItem(roomStorageKey);
    if (raw) data = { ...data, ...(JSON.parse(raw) as Partial<LocalData>) };
  } catch (error) {
    console.warn("[owlbear-merchant] nao foi possivel ler o armazenamento local:", error);
  }

  state.settings = sanitizeSettings(data.settings, state.lang);
  state.wallets = {};
  for (const [id, raw] of Object.entries(data.wallets ?? {})) {
    state.wallets[id] = sanitizeWallet(
      raw,
      id,
      `Player ${id.slice(0, 4)}`,
      "#8b8b9e",
      state.settings.currencies,
    );
  }
  state.orders = sanitizeOrders(data.orders, state.settings.currencies);
  state.shops = {};
  for (const [itemId, raw] of Object.entries(data.shops ?? {})) {
    state.shops[itemId] = sanitizeShop(raw, state.settings);
  }
}

function persistLocalData(): void {
  if (!roomStorageKey) return;
  const data: LocalData = {
    version: 1,
    settings: state.settings,
    wallets: state.wallets,
    orders: state.orders,
    shops: state.shops,
  };
  try {
    localStorage.setItem(roomStorageKey, JSON.stringify(data));
  } catch (error) {
    console.error("[owlbear-merchant] falha ao salvar no armazenamento local:", error);
    toast(
      state.lang === "pt-BR"
        ? "Não foi possível salvar os dados localmente."
        : "Could not save data locally.",
      "error",
    );
  }
}

function signatureOf(items: Item[]): string {
  let signature = "";
  for (const item of items) {
    if (!isImage(item)) continue;
    if (!TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    signature += `|${item.id}:${item.name ?? ""}:${item.image?.url ?? ""}`;
  }
  return signature;
}

let tokensSignature = "";
let partySignature = "";

function setTokens(items: Item[]): void {
  const signature = signatureOf(items);
  if (signature === tokensSignature) {
    // Os dados da loja podem ter mudado sem o token mudar.
    for (const token of state.tokens) token.shop = state.shops[token.id];
    return;
  }
  tokensSignature = signature;

  const tokens: TokenInfo[] = [];
  for (const item of items) {
    if (!isImage(item)) continue;
    if (!TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    tokens.push({
      id: item.id,
      name: item.name || "Token",
      image: item.image?.url ?? "",
      layer: item.layer,
      owner: item.createdUserId ?? "",
      shop: state.shops[item.id],
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
  return state.shops[itemId];
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

export async function saveSettings(next: Settings): Promise<void> {
  state.settings = next;
  persistLocalData();
  requestRender();
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await saveSettings({ ...state.settings, ...patch });
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  state.wallets = {
    ...state.wallets,
    [wallet.id]: { ...wallet, updatedAt: Date.now() },
  };
  persistLocalData();
  requestRender();
}

export async function saveWallets(next: Record<string, Wallet>): Promise<void> {
  state.wallets = next;
  persistLocalData();
  requestRender();
}

export async function saveOrders(next: Order[]): Promise<void> {
  state.orders = next;
  persistLocalData();
  requestRender();
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
  state.shops = { ...state.shops, [itemId]: next };
  persistLocalData();
  setTokens(await OBR.scene.items.getItems());
  requestRender();
  return true;
}

export async function createShop(itemId: string, tokenName: string): Promise<boolean> {
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
  state.shops = { ...state.shops, [itemId]: shop };
  persistLocalData();
  setTokens(await OBR.scene.items.getItems());
  requestRender();
  return true;
}

function defaultShopFor(tokenName: string): ShopData {
  return { ...defaultShop(state.settings, tokenName), enabled: true };
}

export async function deleteShop(itemId: string): Promise<boolean> {
  if (!state.shops[itemId]) return true;
  const next = { ...state.shops };
  delete next[itemId];
  state.shops = next;
  persistLocalData();
  setTokens(await OBR.scene.items.getItems());
  requestRender();
  return true;
}

export function addLog(entry: Omit<LogEntry, "id" | "at">): void {
  const log: LogEntry[] = [
    { id: uid("log"), at: Date.now(), ...entry },
    ...state.settings.log,
  ].slice(0, MAX_LOG_ENTRIES);
  void saveSettings({ ...state.settings, log });
}

/** Tamanho aproximado dos dados locais deste room. */
export function localStorageSize(): number {
  try {
    return new Blob([
      JSON.stringify({
        settings: state.settings,
        wallets: state.wallets,
        orders: state.orders,
        shops: state.shops,
      }),
    ]).size;
  } catch {
    return JSON.stringify({
      settings: state.settings,
      wallets: state.wallets,
      orders: state.orders,
      shops: state.shops,
    }).length;
  }
}

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

async function parseRoute(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const tab = params.get("tab") as ShopTab | null;
  if (shop && state.shops[shop]) {
    navigate({
      name: "shop",
      itemId: shop,
      tab: tab === "sell" || tab === "services" || tab === "manage" ? tab : "buy",
    });
    return;
  }

  // A context-menu action can request a new local shop. Create it before
  // navigating so the popover opens directly in the manager.
  if (shop && state.role === "GM") {
    const token = getToken(shop);
    if (token) {
      await createShop(shop, token.name);
      navigate({ name: "shop", itemId: shop, tab: "manage" });
      return;
    }
  }
  goHome("shops");
}

async function ensureMyWallet(): Promise<void> {
  const fresh = myWallet();
  const existing = state.wallets[fresh.id];
  const needsUpdate =
    !existing ||
    existing.name !== fresh.name ||
    existing.color !== fresh.color ||
    Object.keys(existing.money ?? {}).length !== Object.keys(fresh.money).length;
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

    loadLocalData(OBR.room.id);
    await refreshTokens();
    await parseRoute();
    await ensureMyWallet();

    state.ready = true;
    requestRender();

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

/** Re-sanitiza listas quando as moedas mudam. */
export function resanitizeShopData(shop: ShopData): ShopData {
  return {
    ...shop,
    stock: shop.stock.map((entry) => ({ ...entry })),
    services: shop.services.map((service) => ({ ...service })),
  };
}
