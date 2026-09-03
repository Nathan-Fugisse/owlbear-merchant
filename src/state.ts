import OBR, { isImage, type Item } from "@owlbear-rodeo/sdk";
import { MAX_LOG_ENTRIES, METADATA, TOKEN_LAYERS } from "./constants";
import {
  defaultSettings,
  defaultShop,
  sanitizeOrders,
  sanitizeSettings,
  sanitizeShop,
  sanitizeWallet,
  sanitizeStock,
  sanitizeServices,
} from "./defaults";
import type {
  CatalogItem,
  CatalogService,
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
const CATALOG_KEY = "owlbear-merchant:catalog:v1";

export type TokenInfo = {
  id: string;
  name: string;
  image: string;
  layer: string;
  owner: string;
  shop?: ShopData;
};

export type Catalog = { items: CatalogItem[]; services: CatalogService[] };

type LocalData = {
  version: 2;
  settings: Settings;
  wallets: Record<string, Wallet>;
  orders: Order[];
  shops: Record<string, ShopData>;
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
  shops: Record<string, ShopData>;
  catalog: Catalog;
  roomKey: string;
  route: Route;
  walletViewId: string;
  search: string;
  toast?: Toast;
};

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
  } catch { /* ignore */ }
  return typeof navigator !== "undefined" && navigator.language?.startsWith("pt") ? "pt-BR" : "en";
}

export function saveLang(lang: Lang): void {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
}

function safeParse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

function readCatalog(): Catalog {
  try {
    const raw = safeParse<Partial<Catalog>>(localStorage.getItem(CATALOG_KEY));
    return { items: Array.isArray(raw?.items) ? raw.items : [], services: Array.isArray(raw?.services) ? raw.services : [] };
  } catch { return { items: [], services: [] }; }
}

function writeCatalog(catalog: Catalog): void {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch (error) { console.error("[merchant] catalog save failed", error); }
}

function roomStorageKey(roomId: string): string { return `${DATA_PREFIX}${roomId || "default"}`; }

function loadLocalData(roomId: string, lang: Lang, catalog: Catalog): LocalData {
  const fallback: LocalData = { version: 2, settings: defaultSettings(lang), wallets: {}, orders: [], shops: {} };
  try {
    const raw = safeParse<Partial<LocalData>>(localStorage.getItem(roomStorageKey(roomId)));
    if (!raw) return fallback;
    const settings = sanitizeSettings(raw.settings, lang);
    const shops: Record<string, ShopData> = {};
    for (const [id, value] of Object.entries(raw.shops ?? {})) {
      const source = value as any;
      const expanded = {
        ...source,
        stock: Array.isArray(source.stock) ? source.stock.map((entry: any) => entry?.catalogId
          ? ({ ...(catalog.items.find((x) => x.id === entry.catalogId) ?? entry), quantity: entry.quantity, catalogId: entry.catalogId })
          : entry) : [],
        services: Array.isArray(source.services) ? source.services.map((entry: any) => entry?.catalogId
          ? ({ ...(catalog.services.find((x) => x.id === entry.catalogId) ?? entry), catalogId: entry.catalogId })
          : entry) : [],
      };
      shops[id] = compactShop(sanitizeShop(expanded, settings));
    }
    const wallets: Record<string, Wallet> = {};
    for (const [id, value] of Object.entries(raw.wallets ?? {})) {
      wallets[id] = sanitizeWallet(value, id, `Player ${id.slice(0, 4)}`, "#8b8b9e", settings.currencies);
    }
    return { version: 2, settings, wallets, orders: sanitizeOrders(raw.orders, settings.currencies), shops };
  } catch { return fallback; }
}

function saveLocalData(): void {
  if (!state.roomKey) return;
  const payload: LocalData = { version: 2, settings: state.settings, wallets: state.wallets, orders: state.orders, shops: state.shops };
  try { localStorage.setItem(roomStorageKey(state.roomKey), JSON.stringify(payload)); }
  catch (error) { console.error("[merchant] localStorage save failed", error); toast("Não foi possível salvar no armazenamento local. Exporte um backup JSON.", "error"); }
}

function resolveCatalogItem(entry: any): any {
  if (!entry?.catalogId) return entry;
  const base = state.catalog.items.find((item) => item.id === entry.catalogId);
  return base ? { ...base, quantity: entry.quantity, catalogId: base.id } : entry;
}
function resolveCatalogService(entry: any): any {
  if (!entry?.catalogId) return entry;
  const base = state.catalog.services.find((service) => service.id === entry.catalogId);
  return base ? { ...base, catalogId: base.id } : entry;
}
function resolveShop(shop: ShopData): ShopData {
  return { ...shop, stock: shop.stock.map(resolveCatalogItem), services: shop.services.map(resolveCatalogService) };
}

export const state: AppState = {
  ready: false, sceneReady: false, role: "PLAYER", playerId: "", playerName: "", color: "#ffffff",
  lang: loadLang(), settings: defaultSettings(loadLang()), wallets: {}, orders: [], tokens: [], shops: {},
  catalog: readCatalog(), roomKey: "", route: { name: "home", tab: "shops" }, walletViewId: "", search: "",
};

let renderListener: (() => void) | null = null;
export function onRender(listener: () => void): void { renderListener = listener; }
export function requestRender(): void { renderListener?.(); }
export function setState(patch: Partial<AppState>): void { Object.assign(state, patch); requestRender(); }
let toastId = 0;
let toastTimer: number | undefined;
export function toast(text: string, kind: ToastKind = "info"): void {
  const id = ++toastId; state.toast = { id, text, kind }; requestRender(); window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { if (state.toast?.id === id) { state.toast = undefined; requestRender(); } }, 3500);
}

function shopMarker(itemId: string): Record<string, unknown> { return { enabled: true, local: true, merchantId: itemId }; }

function signatureOf(items: Item[]): string {
  let signature = "";
  for (const item of items) {
    if (!isImage(item) || !TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    signature += `|${item.id}:${item.name ?? ""}:${item.image?.url ?? ""}:${JSON.stringify(item.metadata[METADATA.shop] ?? null)}`;
  }
  return signature;
}
let tokensSignature = "";
let partySignature = "";

function setTokens(items: Item[]): void {
  const signature = signatureOf(items);
  if (signature === tokensSignature) return;
  tokensSignature = signature;
  const tokens: TokenInfo[] = [];
  for (const item of items) {
    if (!isImage(item) || !TOKEN_LAYERS.includes(item.layer as (typeof TOKEN_LAYERS)[number])) continue;
    const marker = item.metadata[METADATA.shop];
    const localShop = state.shops[item.id];
    tokens.push({ id: item.id, name: item.name || "Token", image: item.image?.url ?? "", layer: item.layer, owner: item.createdUserId ?? "", shop: localShop ? resolveShop(localShop) : marker ? undefined : undefined });
  }
  tokens.sort((a, b) => a.name.localeCompare(b.name)); state.tokens = tokens;
}

export async function refreshTokens(): Promise<void> {
  const ready = await OBR.scene.isReady(); state.sceneReady = ready;
  if (!ready) { state.tokens = []; tokensSignature = ""; return; }
  setTokens(await OBR.scene.items.getItems());
}

export function getToken(itemId: string): TokenInfo | undefined { return state.tokens.find((token) => token.id === itemId); }
export function getShop(itemId: string): ShopData | undefined { const shop = state.shops[itemId]; return shop ? resolveShop(shop) : undefined; }
export function myWallet(): Wallet { return state.wallets[state.playerId] ?? sanitizeWallet(undefined, state.playerId, state.playerName, state.color, state.settings.currencies); }
export function viewedWallet(): Wallet { const id = state.walletViewId && state.wallets[state.walletViewId] ? state.walletViewId : state.playerId; return state.wallets[id] ?? myWallet(); }

export async function saveSettings(next: Settings): Promise<void> { state.settings = next; saveLocalData(); requestRender(); }
export async function patchSettings(patch: Partial<Settings>): Promise<void> { await saveSettings({ ...state.settings, ...patch }); }
export async function saveWallet(wallet: Wallet): Promise<void> { state.wallets = { ...state.wallets, [wallet.id]: { ...wallet, updatedAt: Date.now() } }; saveLocalData(); requestRender(); }
export async function saveWallets(next: Record<string, Wallet>): Promise<void> { state.wallets = next; saveLocalData(); requestRender(); }
export async function saveOrders(next: Order[]): Promise<void> { state.orders = next; saveLocalData(); requestRender(); }

function compactShop(shop: ShopData): ShopData {
  return {
    ...shop,
    stock: shop.stock.map((entry: any) => entry.catalogId ? ({ catalogId: entry.catalogId, quantity: entry.quantity }) as any : entry),
    services: shop.services.map((entry: any) => entry.catalogId ? ({ catalogId: entry.catalogId }) as any : entry),
  } as ShopData;
}

export async function updateShop(itemId: string, updater: (shop: ShopData) => ShopData | void): Promise<boolean> {
  const current = getShop(itemId); if (!current) return false;
  const draft = JSON.parse(JSON.stringify(current)) as ShopData;
  const next = updater(draft) ?? draft; next.updatedAt = Date.now();
  state.shops[itemId] = compactShop(next); saveLocalData();
  tokensSignature = ""; await refreshTokens(); requestRender(); return true;
}

export async function createShop(itemId: string, tokenName: string): Promise<boolean> {
  const existing = getShop(itemId);
  if (existing) return updateShop(itemId, (shop) => { shop.enabled = true; if (!shop.name) shop.name = tokenName; });
  state.shops[itemId] = compactShop(sanitizeShop({ ...defaultShop(state.settings, tokenName), enabled: true }, state.settings));
  saveLocalData();
  try { await OBR.scene.items.updateItems((item) => item.id === itemId, (items) => { for (const item of items) (item.metadata as Record<string, unknown>)[METADATA.shop] = shopMarker(itemId); }); } catch (error) { console.error("[merchant] marker save failed", error); }
  tokensSignature = ""; await refreshTokens(); return true;
}

export async function deleteShop(itemId: string): Promise<boolean> {
  delete state.shops[itemId]; saveLocalData();
  try { await OBR.scene.items.updateItems((item) => item.id === itemId, (items) => { for (const item of items) delete (item.metadata as Record<string, unknown>)[METADATA.shop]; }); } catch (error) { console.error("[merchant] marker delete failed", error); return false; }
  tokensSignature = ""; await refreshTokens(); return true;
}

export function saveCatalog(catalog: Catalog): void { state.catalog = catalog; writeCatalog(catalog); tokensSignature = ""; requestRender(); }
export function addCatalogItem(item: CatalogItem): void { saveCatalog({ ...state.catalog, items: [...state.catalog.items, item] }); }
export function addCatalogService(service: CatalogService): void { saveCatalog({ ...state.catalog, services: [...state.catalog.services, service] }); }
export function updateCatalogItem(item: CatalogItem): void { saveCatalog({ ...state.catalog, items: state.catalog.items.map((x) => x.id === item.id ? item : x) }); }
export function updateCatalogService(service: CatalogService): void { saveCatalog({ ...state.catalog, services: state.catalog.services.map((x) => x.id === service.id ? service : x) }); }
export function deleteCatalogItem(id: string): void { saveCatalog({ ...state.catalog, items: state.catalog.items.filter((x) => x.id !== id) }); }
export function deleteCatalogService(id: string): void { saveCatalog({ ...state.catalog, services: state.catalog.services.filter((x) => x.id !== id) }); }

export function addLog(entry: Omit<LogEntry, "id" | "at">): void { void saveSettings({ ...state.settings, log: [{ id: uid("log"), at: Date.now(), ...entry }, ...state.settings.log].slice(0, MAX_LOG_ENTRIES) }); }
export function metadataSize(): number { return 0; }

export function navigate(route: Route): void { state.route = route; const base = import.meta.env.BASE_URL; const url = route.name === "shop" ? `${base}index.html?shop=${encodeURIComponent(route.itemId)}&tab=${route.tab}` : `${base}index.html`; try { window.history.replaceState(null, "", url); } catch { /* ignore */ } requestRender(); }
export function goHome(tab: "shops" | "wallet" | "orders" | "settings" = "shops"): void { navigate({ name: "home", tab }); }
export function openShop(itemId: string, tab: ShopTab = "buy"): void { navigate({ name: "shop", itemId, tab }); }

function parseRoute(): void {
  const params = new URLSearchParams(window.location.search); const shopId = params.get("shop");
  if (shopId) { const tab = params.get("tab") as ShopTab | null; const allowed: ShopTab[] = ["buy", "sell", "services", "manage"]; state.route = { name: "shop", itemId: shopId, tab: tab && allowed.includes(tab) ? tab : "buy" }; }
}

async function ensureMyWallet(): Promise<void> {
  const existing = state.wallets[state.playerId]; const fresh = sanitizeWallet(existing, state.playerId, state.playerName, state.color, state.settings.currencies);
  const needsUpdate = !existing || existing.name !== fresh.name || existing.color !== fresh.color || Object.keys(existing.money ?? {}).length !== Object.keys(fresh.money).length;
  if (needsUpdate) await saveWallet(fresh);
}

export function initApp(): void {
  OBR.onReady(async () => {
    const [role, id, name, color, roomId] = await Promise.all([OBR.player.getRole(), OBR.player.getId(), OBR.player.getName(), OBR.player.getColor(), OBR.room.id]);
    state.role = role; state.playerId = id; state.playerName = name; state.color = color; state.walletViewId = id; state.roomKey = roomId;
    const catalog = readCatalog(); const local = loadLocalData(roomId, state.lang, catalog); state.settings = local.settings; state.wallets = local.wallets; state.orders = local.orders; state.shops = local.shops; state.catalog = catalog;
    parseRoute(); await refreshTokens(); await ensureMyWallet(); state.ready = true; requestRender();
    OBR.scene.items.onChange((items) => { setTokens(items); requestRender(); });
    OBR.scene.onReadyChange((ready) => { state.sceneReady = ready; requestRender(); void refreshTokens().then(requestRender); });
    OBR.party.onChange((players) => { const signature = players.map((player) => `${player.id}:${player.role}:${player.color}`).join("|"); if (signature !== partySignature) { partySignature = signature; requestRender(); } });
    OBR.player.onChange((player) => { state.role = player.role; state.color = player.color; requestRender(); });
  });
}

export function resanitizeShopData(shop: ShopData): ShopData { return { ...shop, stock: sanitizeStock(shop.stock, state.settings.currencies), services: sanitizeServices(shop.services, state.settings.currencies) }; }
