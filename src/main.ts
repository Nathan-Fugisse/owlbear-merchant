import "./style.css";

import OBR from "@owlbear-rodeo/sdk";
import {
  addInventoryItem,
  adjustWalletMoney,
  buyItem,
  hireService,
  removeInventoryItem,
  sellItem,
  setWalletMoney,
  updateInventoryItem,
} from "./actions";
import { defaultCurrencies, normalizeMoney } from "./currency";
import { sanitizeSettings } from "./defaults";
import { newStockEntry, newServiceEntry, sanitizeShop, sanitizeWallet } from "./defaults";
import { clearEditor, getDraft, getTarget, setEditor, updateDraft } from "./editor";
import { renderApp } from "./render";
import {
  createShop,
  deleteShop,
  addCatalogItem,
  addCatalogService,
  updateCatalogItem,
  updateCatalogService,
  deleteCatalogItem,
  deleteCatalogService,
  getShop,
  initApp,
  myWallet,
  onRender,
  openShop,
  patchSettings,
  refreshTokens,
  requestRender,
  saveOrders,
  saveSettings,
  saveWallets,
  saveLang,
  setState,
  state,
  toast,
  updateShop,
  viewedWallet,
  goHome,
} from "./state";
import { t } from "./i18n";
import type {
  CatalogItem,
  CatalogService,
  Currency,
  InventoryEntry,
  Lang,
  ServiceEntry,
  Settings,
  StockEntry,
} from "./types";
import { clamp, toNumber, uid } from "./util";
import { getPresets, newCurrencyId, setBackupText } from "./views/settings";

const app = document.getElementById("app") as HTMLDivElement;

const msg = (key: string, vars?: Record<string, string | number>) =>
  t(state.lang, key, vars);

/* -------------------------------------------------------------------------- */
/* Render loop                                                                */
/* -------------------------------------------------------------------------- */

function render(): void {
  const active = document.activeElement as HTMLElement | null;
  const searchWasFocused = active?.dataset?.field === "search";
  app.innerHTML = renderApp();
  if (searchWasFocused) {
    const input = app.querySelector<HTMLInputElement>('input[data-field="search"]');
    if (input) {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }
  const scroller = app.querySelector<HTMLElement>(".app-body");
  if (scroller && scrollMemory[state.route.name]) {
    scroller.scrollTop = scrollMemory[state.route.name] ?? 0;
  }
  if (scroller) {
    scroller.addEventListener("scroll", () => {
      scrollMemory[state.route.name] = scroller.scrollTop;
    });
  }
}

const scrollMemory: Record<string, number> = {};

onRender(render);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function dataOf(element: HTMLElement): Record<string, string> {
  return { ...element.dataset } as Record<string, string>;
}

function qtyFor(id: string): number {
  const input = app.querySelector<HTMLInputElement>(`input[data-qty-for="${id}"]`);
  const value = toNumber(input?.value, 1);
  return clamp(Math.round(value), 1, 999);
}

function currentShopId(): string | null {
  return state.route.name === "shop" ? state.route.itemId : null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyEditField(path: string, raw: string | boolean, type: string): void {
  const draft = getDraft();
  if (!draft) return;

  let value: unknown = raw;
  if (type === "number") value = toNumber(raw, 0);
  if (type === "checkbox") value = raw === true;

  // Always update through the editor state setter. Mutating the old draft
  // after updateDraft() used to update a stale object, so price/currency and
  // other nested fields appeared editable but were lost when saving.
  if (path.includes(".")) {
    const [head, tail] = path.split(".");
    const nested = (draft as unknown as Record<string, unknown>)[head];
    updateDraft({
      [head]: {
        ...((nested ?? {}) as Record<string, unknown>),
        [tail]: value,
      },
    });
  } else {
    updateDraft({ [path]: value });
  }
}

/* -------------------------------------------------------------------------- */
/* Acoes de carteira / moeda                                                  */
/* -------------------------------------------------------------------------- */

async function normalizeAfterCurrencyChange(): Promise<void> {
  const currencies = state.settings.currencies;
  const first = currencies[0]?.id ?? "";
  const fixPrice = (price: { amount: number; currencyId: string }) =>
    currencies.some((currency) => currency.id === price.currencyId)
      ? price
      : { ...price, currencyId: first };

  const wallets: Record<string, ReturnType<typeof sanitizeWallet>> = {};
  for (const [id, wallet] of Object.entries(state.wallets)) {
    const money: Record<string, number> = {};
    for (const currency of currencies) {
      money[currency.id] = toNumber(wallet.money?.[currency.id], 0);
    }
    wallets[id] = {
      ...wallet,
      money,
      inventory: wallet.inventory.map((entry) => ({
        ...entry,
        price: fixPrice(entry.price),
      })),
    };
  }
  await saveWallets(wallets as never);

  state.catalog = {
    items: state.catalog.items.map((item) => ({ ...item, price: fixPrice(item.price) })),
    services: state.catalog.services.map((service) => ({ ...service, price: fixPrice(service.price) })),
  };
  localStorage.setItem("owlbear-merchant:catalog:v1", JSON.stringify(state.catalog));

  for (const token of state.tokens) {
    if (!token.shop) continue;
    void updateShop(token.id, (draft) => {
      const funds: Record<string, number> = {};
      for (const currency of currencies) {
        funds[currency.id] = toNumber(draft.funds?.[currency.id], 0);
      }
      draft.funds = funds;
      draft.stock = draft.stock.map((entry) => ({
        ...entry,
        price: fixPrice(entry.price),
      }));
      draft.services = draft.services.map((service) => ({
        ...service,
        price: fixPrice(service.price),
      }));
    });
  }
}

async function saveCurrencies(currencies: Currency[]): Promise<void> {
  await patchSettings({ currencies });
  await normalizeAfterCurrencyChange();
}

/* -------------------------------------------------------------------------- */
/* Click                                                                      */
/* -------------------------------------------------------------------------- */

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-action]",
  );
  if (!target || !app.contains(target)) return;
  const data = dataOf(target);
  const action = data.action ?? "";
  if (data.confirm && !window.confirm(data.confirm)) return;

  switch (action) {
    case "toggle-theme": {
      const next = localStorage.getItem("merchant-theme") === "light" ? "dark" : "light";
      localStorage.setItem("merchant-theme", next);
      requestRender();
      return;
    }
    case "dismiss-toast":
      state.toast = undefined;
      requestRender();
      return;
    case "tab":
      goHome((data.value ?? "shops") as never);
      return;
    case "shop-tab": {
      const shopId = currentShopId();
      if (shopId) openShop(shopId, (data.value ?? "buy") as never);
      return;
    }
    case "back":
      goHome("shops");
      return;
    case "open-shop":
      openShop(data.id ?? "", "buy");
      return;
    case "open-manage":
      openShop(data.id ?? "", "manage");
      return;
    case "create-shop": {
      const token = state.tokens.find((entry) => entry.id === data.id);
      void (async () => {
        const ok = await createShop(data.id ?? "", token?.name ?? "");
        if (!ok) {
          toast(msg("shop.noPermission"), "error");
          return;
        }
        await refreshTokens();
        openShop(data.id ?? "", "manage");
      })();
      return;
    }
    case "delete-shop":
      void (async () => {
        const ok = await deleteShop(data.id ?? "");
        await refreshTokens();
        goHome("shops");
        if (!ok) toast(msg("shop.noPermission"), "error");
      })();
      return;
    case "buy": {
      const shopId = currentShopId();
      if (shopId) void buyItem(shopId, data.id ?? "", qtyFor(data.id ?? ""));
      return;
    }
    case "sell": {
      const shopId = currentShopId();
      if (shopId) void sellItem(shopId, data.id ?? "", qtyFor(`sell_${data.id ?? ""}`));
      return;
    }
    case "hire": {
      const shopId = currentShopId();
      if (shopId) void hireService(shopId, data.id ?? "");
      return;
    }

    /* ---- biblioteca de itens/servicos ---- */
    case "new-catalog-item": {
      if (state.role !== "GM") return;
      const item = newStockEntry(state.settings.currencies);
      addCatalogItem(item);
      setEditor({ kind: "catalog-item", entryId: item.id }, clone(item));
      requestRender();
      return;
    }
    case "new-catalog-service": {
      if (state.role !== "GM") return;
      const service = newServiceEntry(state.settings.currencies);
      addCatalogService(service);
      setEditor({ kind: "catalog-service", entryId: service.id }, clone(service));
      requestRender();
      return;
    }
    case "delete-catalog-item":
      if (state.role !== "GM") return;
      deleteCatalogItem(data.id ?? "");
      return;
    case "delete-catalog-service":
      if (state.role !== "GM") return;
      deleteCatalogService(data.id ?? "");
      return;
    case "add-catalog-item-to-shop": {
      if (state.role !== "GM") return;
      const shopId = currentShopId();
      const item = state.catalog.items.find((x) => x.id === data.id);
      if (shopId && item) void updateShop(shopId, (draft) => {
        if (!draft.stock.some((x) => x.catalogId === item.id)) {
          draft.stock = [...draft.stock, { ...clone(item), catalogId: item.id, quantity: 1 }];
        }
      });
      return;
    }
    case "add-catalog-service-to-shop": {
      if (state.role !== "GM") return;
      const shopId = currentShopId();
      const service = state.catalog.services.find((x) => x.id === data.id);
      if (shopId && service) void updateShop(shopId, (draft) => {
        if (!draft.services.some((x) => x.catalogId === service.id)) {
          draft.services = [...draft.services, { ...clone(service), catalogId: service.id }];
        }
      });
      return;
    }
    case "edit-catalog-item": {
      if (state.role !== "GM") return;
      const entry = state.catalog.items.find((x) => x.id === data.id);
      if (entry) { setEditor({ kind: "catalog-item", entryId: entry.id }, clone(entry)); requestRender(); }
      return;
    }
    case "edit-catalog-service": {
      if (state.role !== "GM") return;
      const entry = state.catalog.services.find((x) => x.id === data.id);
      if (entry) { setEditor({ kind: "catalog-service", entryId: entry.id }, clone(entry)); requestRender(); }
      return;
    }

    /* ---- editores ---- */
    case "new-stock":
      setEditor({ kind: "stock", entryId: null }, newStockEntry(state.settings.currencies));
      requestRender();
      return;
    case "edit-stock": {
      const entry = getShop(currentShopId() ?? "")?.stock.find(
        (stock) => stock.id === data.id,
      );
      if (entry) {
        setEditor({ kind: "stock", entryId: entry.id }, clone(entry));
        requestRender();
      }
      return;
    }
    case "new-service":
      setEditor(
        { kind: "service", entryId: null },
        newServiceEntry(state.settings.currencies),
      );
      requestRender();
      return;
    case "edit-service": {
      const entry = getShop(currentShopId() ?? "")?.services.find(
        (service) => service.id === data.id,
      );
      if (entry) {
        setEditor({ kind: "service", entryId: entry.id }, clone(entry));
        requestRender();
      }
      return;
    }
    case "new-inventory":
      setEditor(
        { kind: "inventory", entryId: null, walletId: data.id ?? state.playerId },
        {
          ...newStockEntry(state.settings.currencies),
          id: uid("item"),
          quantity: 1,
        },
      );
      requestRender();
      return;
    case "edit-inventory": {
      const wallet = viewedWallet();
      const entry = wallet.inventory.find((item) => item.id === data.id);
      if (entry) {
        setEditor(
          { kind: "inventory", entryId: entry.id, walletId: wallet.id },
          clone(entry),
        );
        requestRender();
      }
      return;
    }
    case "delete-stock": {
      const shopId = currentShopId();
      if (!shopId || !data.id) return;
      void updateShop(shopId, (draft) => {
        draft.stock = draft.stock.filter((entry) => entry.id !== data.id);
      });
      return;
    }
    case "delete-service": {
      const shopId = currentShopId();
      if (!shopId || !data.id) return;
      void updateShop(shopId, (draft) => {
        draft.services = draft.services.filter((service) => service.id !== data.id);
      });
      return;
    }
    case "delete-inventory":
      void removeInventoryItem(viewedWallet().id, data.id ?? "");
      return;
    case "cancel-edit":
      clearEditor();
      requestRender();
      return;
    case "save-edit":
      void saveEditor();
      return;
    case "stock-from-inventory": {
      const shopId = currentShopId();
      const entry = myWallet().inventory.find((item) => item.id === data.id);
      if (shopId && entry) {
        void updateShop(shopId, (draft) => {
          draft.stock = [
            ...draft.stock,
            { ...clone(entry), id: uid("item"), quantity: entry.quantity },
          ];
        });
      }
      return;
    }

    /* ---- pedidos ---- */
    case "order-done":
    case "order-reopen":
      void saveOrders(
        state.orders.map((order) =>
          order.id === data.id ? { ...order, done: action === "order-done" } : order,
        ),
      );
      return;
    case "order-delete":
      void saveOrders(state.orders.filter((order) => order.id !== data.id));
      return;

    /* ---- moedas ---- */
    case "add-currency": {
      if (state.role !== "GM") return;
      const currencies = state.settings.currencies;
      const index = currencies.length + 1;
      const next: Currency = {
        id: newCurrencyId(),
        name: `${msg("settings.currency")} ${index}`,
        plural: `${msg("settings.currency")} ${index}`,
        symbol: `M${index}`,
        color: "#9b8cff",
        rate: Math.max(1, Math.round((currencies[0]?.rate ?? 100) / 10 ** index) || 1),
        decimals: 0,
      };
      void saveCurrencies([...currencies, next]);
      return;
    }
    case "delete-currency": {
      if (state.role !== "GM") return;
      const currencies = state.settings.currencies;
      if (currencies.length <= 1) return;
      void saveCurrencies(currencies.filter((currency) => currency.id !== data.id));
      return;
    }
    case "move-currency": {
      if (state.role !== "GM") return;
      const currencies = [...state.settings.currencies];
      const index = currencies.findIndex((currency) => currency.id === data.id);
      const nextIndex = data.value === "up" ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= currencies.length) return;
      const [moved] = currencies.splice(index, 1);
      currencies.splice(nextIndex, 0, moved);
      void saveCurrencies(currencies);
      return;
    }
    case "preset": {
      if (state.role !== "GM") return;
      const presets = getPresets(state.lang);
      const preset = presets[data.value ?? "dnd"];
      if (!preset) return;
      void saveCurrencies(
        preset.map((currency) => ({ ...currency, id: newCurrencyId() })),
      );
      return;
    }
    case "clear-log":
      void patchSettings({ log: [] });
      return;
    case "clear-absent":
      void (async () => {
        const players = await OBR.party.getPlayers();
        const present = new Set(players.map((player) => player.id));
        present.add(state.playerId);
        const next: Record<string, never> = {};
        for (const [id, wallet] of Object.entries(state.wallets)) {
          if (present.has(id)) (next as Record<string, unknown>)[id] = wallet;
        }
        await saveWallets(next as never);
      })();
      return;
    case "reset-all":
      void (async () => {
        await saveSettings({
          ...state.settings,
          currencies: defaultCurrencies(state.lang),
          log: [],
        });
        await saveWallets({});
        await saveOrders([]);
        for (const token of state.tokens) {
          if (token.shop) void deleteShop(token.id);
        }
        await refreshTokens();
        goHome("settings");
      })();
      return;
    case "export-json": {
      const payload = {
        format: "owlbear-merchant-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        settings: state.settings,
        wallets: state.wallets,
        orders: state.orders,
        shops: state.shops,
        catalog: state.catalog,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `owlbear-merchant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      toast("Backup JSON criado.", "success");
      return;
    }
    case "import-json": {
      if (state.role !== "GM") return;
      const input = document.createElement("input");
      input.type = "file"; input.accept = "application/json,.json";
      input.onchange = () => {
        const file = input.files?.[0]; if (!file) return;
        void file.text().then(async (text) => {
          try {
            const parsed = JSON.parse(text) as any;
            if (parsed.format !== "owlbear-merchant-backup") throw new Error("Formato inválido");
            if (parsed.catalog) localStorage.setItem("owlbear-merchant:catalog:v1", JSON.stringify(parsed.catalog));
            const next: Settings = sanitizeSettings(parsed.settings, state.lang);
            await saveSettings(next);
            await saveWallets(parsed.wallets ?? {});
            await saveOrders(parsed.orders ?? []);
            state.catalog = parsed.catalog ?? { items: [], services: [] };
            state.shops = parsed.shops ?? {};
            localStorage.setItem(`owlbear-merchant:data:${state.roomKey}`, JSON.stringify({ version: 2, settings: state.settings, wallets: state.wallets, orders: state.orders, shops: state.shops }));
            await saveOrders(state.orders);
            await refreshTokens(); requestRender();
            toast("Backup restaurado com sucesso.", "success");
          } catch (error) {
            console.error(error); toast("Não foi possível restaurar este backup.", "error");
          }
        });
      };
      input.click();
      return;
    }
    case "shop-rarity-reset": {
      const shopId = currentShopId();
      if (shopId) {
        void updateShop(shopId, (draft) => {
          draft.rarityMultipliers = {};
        });
      }
      return;
    }
    default:
      return;
  }
});

/* -------------------------------------------------------------------------- */
/* Change / input                                                             */
/* -------------------------------------------------------------------------- */

app.addEventListener("change", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-field]",
  );
  if (!target || !app.contains(target)) return;
  const data = dataOf(target);
  const field = data.field ?? "";
  const value = (target as HTMLInputElement).value;
  const checked = (target as HTMLInputElement).checked;

  if (data.editField) {
    applyEditField(
      data.editField,
      (target as HTMLInputElement).type === "checkbox" ? checked : value,
      (target as HTMLInputElement).type === "checkbox"
        ? "checkbox"
        : (target as HTMLInputElement).type === "number"
          ? "number"
          : "text",
    );
    return;
  }

  switch (field) {
    case "lang": {
      const lang = value as Lang;
      state.lang = lang;
      saveLang(lang);
      requestRender();
      return;
    }
    case "wallet-owner":
      if (state.role !== "GM") return;
      setState({ walletViewId: value });
      return;
    case "wallet-money": {
      if (state.role !== "GM") return;
      const wallet = viewedWallet();
      void setWalletMoney(wallet.id, {
        ...wallet.money,
        [data.id ?? ""]: toNumber(value, 0),
      });
      return;
    }
    case "search":
      setState({ search: value });
      return;
    case "backup-text":
      setBackupText(value);
      return;

    /* ---- loja ---- */
    case "shop-name":
    case "shop-greeting":
    case "shop-price":
    case "shop-payout": {
      const shopId = currentShopId();
      if (!shopId) return;
      void updateShop(shopId, (draft) => {
        if (field === "shop-name") draft.name = value.slice(0, 60);
        if (field === "shop-greeting") draft.greeting = value.slice(0, 300);
        if (field === "shop-price") draft.priceMultiplier = Math.max(0, toNumber(value, 1));
        if (field === "shop-payout") draft.payoutMultiplier = Math.max(0, toNumber(value, 0.5));
      });
      return;
    }
    case "shop-enabled":
    case "shop-infinite":
    case "shop-allow-owner": {
      const shopId = currentShopId();
      if (!shopId) return;
      void updateShop(shopId, (draft) => {
        if (field === "shop-enabled") draft.enabled = checked;
        if (field === "shop-infinite") draft.infiniteFunds = checked;
        if (field === "shop-allow-owner") draft.allowPlayerManage = checked;
      });
      return;
    }
    case "shop-fund": {
      const shopId = currentShopId();
      if (!shopId) return;
      void updateShop(shopId, (draft) => {
        draft.funds = { ...draft.funds, [data.id ?? ""]: Math.max(0, toNumber(value, 0)) };
      });
      return;
    }
    case "shop-rarity": {
      const shopId = currentShopId();
      if (!shopId) return;
      void updateShop(shopId, (draft) => {
        draft.rarityMultipliers = {
          ...draft.rarityMultipliers,
          [data.id ?? ""]: Math.max(0, toNumber(value, 1)),
        };
      });
      return;
    }

    /* ---- configuracoes ---- */
    case "setting-price":
      if (state.role !== "GM") return;
      void patchSettings({ defaultPriceMultiplier: Math.max(0, toNumber(value, 1)) });
      return;
    case "setting-payout":
      if (state.role !== "GM") return;
      void patchSettings({ defaultPayoutMultiplier: Math.max(0, toNumber(value, 0.5)) });
      return;
    case "setting-showRarity":
      if (state.role !== "GM") return;
      void patchSettings({ showRarity: checked });
      return;
    case "rarity-mult":
      if (state.role !== "GM") return;
      void patchSettings({
        rarityMultipliers: {
          ...state.settings.rarityMultipliers,
          [data.id ?? ""]: Math.max(0, toNumber(value, 1)),
        } as Settings["rarityMultipliers"],
      });
      return;
    case "currency-name":
    case "currency-plural":
    case "currency-symbol":
    case "currency-rate":
    case "currency-decimals":
    case "currency-color": {
      if (state.role !== "GM") return;
      const currencies = state.settings.currencies.map((currency) => {
        if (currency.id !== data.id) return currency;
        switch (field) {
          case "currency-name":
            return { ...currency, name: value.slice(0, 40) };
          case "currency-plural":
            return { ...currency, plural: value.slice(0, 40) };
          case "currency-symbol":
            return { ...currency, symbol: value.slice(0, 8) };
          case "currency-rate":
            return { ...currency, rate: Math.max(0.0001, toNumber(value, 1)) };
          case "currency-decimals":
            return { ...currency, decimals: clamp(Math.round(toNumber(value, 0)), 0, 4) };
          default:
            return { ...currency, color: value };
        }
      });
      void patchSettings({ currencies });
      return;
    }
    default:
      return;
  }
});

app.addEventListener("input", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-edit-field], [data-field]",
  );
  if (!target || !app.contains(target)) return;
  const data = dataOf(target);
  const input = target as HTMLInputElement;

  if (data.editField) {
    applyEditField(
      data.editField,
      input.type === "checkbox" ? input.checked : input.value,
      input.type === "checkbox" ? "checkbox" : input.type === "number" ? "number" : "text",
    );
    return;
  }

  if (data.field === "search") {
    setState({ search: input.value });
    return;
  }
  if (data.field === "backup-text") {
    setBackupText(input.value);
  }
});

/* Imagens quebradas nao devem mostrar o icone de erro do navegador */
document.addEventListener(
  "error",
  (event) => {
    const element = event.target as HTMLElement | null;
    if (element?.tagName === "IMG") element.classList.add("broken");
  },
  true,
);

/* -------------------------------------------------------------------------- */
/* Editor                                                                     */
/* -------------------------------------------------------------------------- */

async function saveEditor(): Promise<void> {
  const target = getTarget();
  const draft = getDraft();
  if (!target || !draft) return;
  const currencies = state.settings.currencies;

  if (target.kind === "catalog-item") {
    const entry: CatalogItem = {
      ...(draft as CatalogItem),
      id: (draft as CatalogItem).id || uid("item"),
      name: (draft as CatalogItem).name || "Item",
      price: {
        amount: Math.max(0, toNumber((draft as CatalogItem).price.amount, 0)),
        currencyId: (draft as CatalogItem).price.currencyId || currencies[0]?.id || "",
      },
    };
    updateCatalogItem(entry);
  } else if (target.kind === "catalog-service") {
    const entry: CatalogService = {
      ...(draft as CatalogService),
      id: (draft as CatalogService).id || uid("svc"),
      name: (draft as CatalogService).name || "Serviço",
      price: {
        amount: Math.max(0, toNumber((draft as CatalogService).price.amount, 0)),
        currencyId: (draft as CatalogService).price.currencyId || currencies[0]?.id || "",
      },
    };
    updateCatalogService(entry);
  } else if (target.kind === "stock") {
    const shopId = currentShopId();
    if (!shopId) return;
    const entry: StockEntry = {
      ...(draft as StockEntry),
      id: (draft as StockEntry).id || uid("item"),
      name: (draft as StockEntry).name || msg("shop.newItem"),
      price: {
        amount: Math.max(0, toNumber((draft as StockEntry).price.amount, 0)),
        currencyId: (draft as StockEntry).price.currencyId || currencies[0]?.id || "",
      },
    };
    if (entry.catalogId) {
      const { quantity: _quantity, ...catalogItem } = entry;
      updateCatalogItem(catalogItem as CatalogItem);
    } else {
      await updateShop(shopId, (shop) => {
        shop.stock = target.entryId
          ? shop.stock.map((stock) => (stock.id === target.entryId ? entry : stock))
          : [...shop.stock, entry];
      });
    }
  } else if (target.kind === "service") {
    const shopId = currentShopId();
    if (!shopId) return;
    const entry: ServiceEntry = {
      ...(draft as ServiceEntry),
      id: (draft as ServiceEntry).id || uid("svc"),
      name: (draft as ServiceEntry).name || msg("shop.newService"),
      price: {
        amount: Math.max(0, toNumber((draft as ServiceEntry).price.amount, 0)),
        currencyId:
          (draft as ServiceEntry).price.currencyId || currencies[0]?.id || "",
      },
    };
    if (entry.catalogId) {
      updateCatalogService(entry);
    } else {
      await updateShop(shopId, (shop) => {
        shop.services = target.entryId
          ? shop.services.map((service) =>
              service.id === target.entryId ? entry : service,
            )
          : [...shop.services, entry];
      });
    }
  } else {
    const entry: InventoryEntry = {
      ...(draft as InventoryEntry),
      id: (draft as InventoryEntry).id || uid("item"),
      name: (draft as InventoryEntry).name || "Item",
      quantity: Math.max(1, Math.round(toNumber((draft as InventoryEntry).quantity, 1))),
      price: {
        amount: Math.max(0, toNumber((draft as InventoryEntry).price.amount, 0)),
        currencyId:
          (draft as InventoryEntry).price.currencyId || currencies[0]?.id || "",
      },
    };
    const walletId = target.walletId || state.playerId;
    if (target.entryId) {
      await updateInventoryItem(walletId, target.entryId, entry);
    } else {
      await addInventoryItem(walletId, entry);
    }
  }

  clearEditor();
  requestRender();
}

/* -------------------------------------------------------------------------- */
/* Ajuste fino de carteira (botoes + / -)                                     */
/* -------------------------------------------------------------------------- */

export async function adjustWallet(
  walletId: string,
  currencyId: string,
  delta: number,
): Promise<void> {
  await adjustWalletMoney(walletId, { [currencyId]: delta });
}

export function normalizeMoneyFor(money: Record<string, number>): Record<string, number> {
  return normalizeMoney(money, state.settings.currencies);
}

export function sanitizeShopData(raw: unknown) {
  return sanitizeShop(raw, state.settings);
}

/* -------------------------------------------------------------------------- */

initApp();
render();
