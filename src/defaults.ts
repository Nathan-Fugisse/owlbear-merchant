import { defaultCurrencies, emptyMoney } from "./currency";
import { DATA_VERSION } from "./constants";
import type {
  Currency,
  InventoryEntry,
  ItemBase,
  Lang,
  LogEntry,
  Order,
  Price,
  RarityKey,
  ServiceEntry,
  Settings,
  ShopData,
  StockEntry,
  Wallet,
} from "./types";
import { RARITY_KEYS } from "./i18n";
import { clamp, isNumber, toNumber, truncate, uid } from "./util";

export function defaultRarityMultipliers(): Record<RarityKey, number> {
  return {
    common: 1,
    uncommon: 1.25,
    rare: 1.5,
    veryRare: 2,
    legendary: 3,
    artifact: 5,
  };
}

export function defaultSettings(lang: Lang = "pt-BR"): Settings {
  return {
    version: DATA_VERSION,
    currencies: defaultCurrencies(lang),
    defaultPriceMultiplier: 1,
    defaultPayoutMultiplier: 0.5,
    rarityMultipliers: defaultRarityMultipliers(),
    showRarity: true,
    log: [],
  };
}

export function defaultShop(
  settings: Settings,
  tokenName = "",
): ShopData {
  return {
    version: DATA_VERSION,
    enabled: true,
    name: tokenName,
    greeting: "",
    priceMultiplier: settings.defaultPriceMultiplier,
    payoutMultiplier: settings.defaultPayoutMultiplier,
    infiniteFunds: true,
    funds: emptyMoney(settings.currencies),
    allowPlayerManage: false,
    rarityMultipliers: {},
    stock: [],
    services: [],
    updatedAt: Date.now(),
  };
}

export function defaultWallet(
  id: string,
  name: string,
  color: string,
  currencies: Currency[],
): Wallet {
  return {
    id,
    name,
    color,
    money: emptyMoney(currencies),
    inventory: [],
    updatedAt: Date.now(),
  };
}

export function emptyPrice(currencies: Currency[]): Price {
  return { amount: 0, currencyId: currencies[0]?.id ?? "" };
}

export function newStockEntry(currencies: Currency[]): StockEntry {
  return {
    id: uid("item"),
    name: "",
    description: "",
    icon: "",
    price: emptyPrice(currencies),
    rarity: "",
    weight: 0,
    quantity: 1,
  };
}

export function newServiceEntry(currencies: Currency[]): ServiceEntry {
  return {
    id: uid("svc"),
    name: "",
    description: "",
    icon: "",
    price: emptyPrice(currencies),
    active: true,
  };
}

export function toInventoryEntry(
  item: ItemBase,
  quantity: number,
): InventoryEntry {
  return { ...item, quantity };
}

/* -------------------------------------------------------------------------- */
/* Sanitizacao: todo dado vem da rede e pode estar corrompido/incompativel    */
/* -------------------------------------------------------------------------- */

function sanitizeCurrency(raw: unknown, index: number): Currency {
  const value = (raw ?? {}) as Partial<Currency>;
  const name = truncate(String(value.name ?? `Moeda ${index + 1}`), 40);
  return {
    id: String(value.id ?? `currency_${index}`),
    name,
    plural: truncate(String(value.plural ?? name), 40),
    symbol: truncate(String(value.symbol ?? name.slice(0, 3).toUpperCase()), 8),
    color: /^#[0-9a-fA-F]{3,8}$/.test(String(value.color ?? ""))
      ? String(value.color)
      : "#c7ced8",
    rate: Math.max(0.0001, toNumber(value.rate, 1)),
    decimals: clamp(Math.round(toNumber(value.decimals, 0)), 0, 4),
  };
}

export function sanitizeSettings(raw: unknown, lang: Lang): Settings {
  const fallback = defaultSettings(lang);
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<Settings>;
  const rawCurrencies = Array.isArray(value.currencies)
    ? value.currencies
    : fallback.currencies;
  const currencies = rawCurrencies.map(sanitizeCurrency);
  const seen = new Set<string>();
  const uniqueCurrencies = currencies.filter((currency) => {
    if (seen.has(currency.id)) return false;
    seen.add(currency.id);
    return true;
  });
  const list = uniqueCurrencies.length
    ? uniqueCurrencies
    : defaultCurrencies(lang);

  const multipliers = defaultRarityMultipliers();
  if (value.rarityMultipliers && typeof value.rarityMultipliers === "object") {
    for (const key of RARITY_KEYS) {
      const candidate = (value.rarityMultipliers as Record<string, unknown>)[key];
      if (isNumber(candidate)) multipliers[key] = Math.max(0, candidate);
    }
  }

  return {
    version: DATA_VERSION,
    currencies: list,
    defaultPriceMultiplier: Math.max(0, toNumber(value.defaultPriceMultiplier, 1)),
    defaultPayoutMultiplier: Math.max(
      0,
      toNumber(value.defaultPayoutMultiplier, 0.5),
    ),
    rarityMultipliers: multipliers,
    showRarity: value.showRarity !== false,
    log: sanitizeLog(value.log),
  };
}

function sanitizeLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is LogEntry => !!entry && typeof entry === "object")
    .slice(0, 50)
    .map((entry) => ({
      id: String(entry.id ?? uid("log")),
      at: toNumber(entry.at, Date.now()),
      type: (["buy", "sell", "service", "transfer", "adjust"] as const).includes(
        entry.type,
      )
        ? entry.type
        : "adjust",
      player: truncate(String(entry.player ?? ""), 60),
      merchant: truncate(String(entry.merchant ?? ""), 60),
      amount: toNumber(entry.amount, 0),
      detail: truncate(String(entry.detail ?? ""), 120),
    }));
}

function sanitizePrice(raw: unknown, currencies: Currency[]): Price {
  const value = (raw ?? {}) as Partial<Price>;
  const currencyId = currencies.some((c) => c.id === value.currencyId)
    ? String(value.currencyId)
    : (currencies[0]?.id ?? "");
  return { amount: Math.max(0, toNumber(value.amount, 0)), currencyId };
}

function sanitizeItemBase(raw: unknown, currencies: Currency[]): ItemBase {
  const value = (raw ?? {}) as Partial<ItemBase>;
  const rarity = RARITY_KEYS.includes(value.rarity as RarityKey)
    ? (value.rarity as RarityKey)
    : "";
  return {
    id: String(value.id ?? uid("item")),
    name: truncate(String(value.name ?? "Item"), 80),
    description: truncate(String(value.description ?? ""), 600),
    icon: String(value.icon ?? ""),
    price: sanitizePrice(value.price, currencies),
    rarity,
    weight: Math.max(0, toNumber(value.weight, 0)),
  };
}

export function sanitizeStock(
  raw: unknown,
  currencies: Currency[],
): StockEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => ({
    ...sanitizeItemBase(entry, currencies),
    quantity: Math.round(toNumber((entry as StockEntry)?.quantity, 1)),
  }));
}

export function sanitizeServices(
  raw: unknown,
  currencies: Currency[],
): ServiceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const value = (entry ?? {}) as Partial<ServiceEntry>;
    return {
      id: String(value.id ?? uid("svc")),
      name: truncate(String(value.name ?? "Serviço"), 80),
      description: truncate(String(value.description ?? ""), 600),
      icon: String(value.icon ?? ""),
      price: sanitizePrice(value.price, currencies),
      active: value.active !== false,
    };
  });
}

export function sanitizeShop(raw: unknown, settings: Settings): ShopData {
  const fallback = defaultShop(settings);
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<ShopData>;
  const currencies = settings.currencies;
  const funds: Record<string, number> = {};
  for (const currency of currencies) {
    const amount = (value.funds as Record<string, unknown>)?.[currency.id];
    funds[currency.id] = Math.max(0, toNumber(amount, 0));
  }
  const rarityMultipliers: Partial<Record<RarityKey, number>> = {};
  for (const key of RARITY_KEYS) {
    const candidate = (value.rarityMultipliers as Record<string, unknown>)?.[key];
    if (isNumber(candidate)) rarityMultipliers[key] = Math.max(0, candidate);
  }
  return {
    version: DATA_VERSION,
    enabled: value.enabled !== false,
    name: truncate(String(value.name ?? ""), 60),
    greeting: truncate(String(value.greeting ?? ""), 300),
    priceMultiplier: Math.max(0, toNumber(value.priceMultiplier, settings.defaultPriceMultiplier)),
    payoutMultiplier: Math.max(0, toNumber(value.payoutMultiplier, settings.defaultPayoutMultiplier)),
    infiniteFunds: value.infiniteFunds !== false,
    funds,
    allowPlayerManage: value.allowPlayerManage === true,
    rarityMultipliers,
    stock: sanitizeStock(value.stock, currencies),
    services: sanitizeServices(value.services, currencies),
    updatedAt: toNumber(value.updatedAt, Date.now()),
  };
}

export function sanitizeWallet(
  raw: unknown,
  id: string,
  name: string,
  color: string,
  currencies: Currency[],
): Wallet {
  const fallback = defaultWallet(id, name, color, currencies);
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<Wallet>;
  const money: Record<string, number> = {};
  for (const currency of currencies) {
    money[currency.id] = toNumber(
      (value.money as Record<string, unknown>)?.[currency.id],
      0,
    );
  }
  const inventory = Array.isArray(value.inventory)
    ? value.inventory.map((entry) => ({
        ...sanitizeItemBase(entry, currencies),
        quantity: Math.max(0, Math.round(toNumber((entry as InventoryEntry)?.quantity, 1))),
      }))
    : [];
  return {
    id,
    name: truncate(String(value.name ?? name), 60),
    color: String(value.color ?? color),
    money,
    inventory,
    updatedAt: toNumber(value.updatedAt, Date.now()),
  };
}

export function sanitizeOrders(raw: unknown, currencies: Currency[]): Order[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Order => !!entry && typeof entry === "object")
    .slice(0, 100)
    .map((entry) => ({
      id: String(entry.id ?? uid("ord")),
      merchantId: String(entry.merchantId ?? ""),
      merchantName: truncate(String(entry.merchantName ?? ""), 60),
      serviceId: String(entry.serviceId ?? ""),
      serviceName: truncate(String(entry.serviceName ?? ""), 80),
      playerId: String(entry.playerId ?? ""),
      playerName: truncate(String(entry.playerName ?? ""), 60),
      price: sanitizePrice(entry.price, currencies),
      createdAt: toNumber(entry.createdAt, Date.now()),
      done: entry.done === true,
    }));
}
