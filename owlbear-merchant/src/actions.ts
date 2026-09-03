import OBR from "@owlbear-rodeo/sdk";
import {
  addMoney,
  baseText,
  baseToMoney,
  moneyToBase,
  normalizeMoney,
  pay,
  priceToBase,
  subtractMoney,
} from "./currency";
import { toInventoryEntry } from "./defaults";
import { t } from "./i18n";
import {
  addLog,
  getShop,
  getToken,
  myWallet,
  saveOrders,
  saveWallet,
  saveWallets,
  state,
  toast,
  updateShop,
} from "./state";
import type { InventoryEntry, ItemBase, Money, StockEntry } from "./types";
import { clean, uid } from "./util";

const msg = (key: string, vars?: Record<string, string | number>) =>
  t(state.lang, key, vars);

function rarityMultiplier(shop: ReturnType<typeof getShop>, rarity: string): number {
  if (!shop || !rarity) return 1;
  const custom = shop.rarityMultipliers?.[rarity as never];
  if (typeof custom === "number") return custom;
  return state.settings.rarityMultipliers[rarity as never] ?? 1;
}

/** Verifica o alcance de interacao usando os tokens selecionados pelo jogador. */
async function withinRange(itemId: string): Promise<boolean> {
  const shop = getShop(itemId);
  const range = shop?.interactionRange ?? 0;
  if (range <= 0) return true;
  if (!(await OBR.scene.isReady())) return true;
  const selection = await OBR.player.getSelection();
  if (!selection || selection.length === 0) return true;
  const items = await OBR.scene.items.getItems(
    (item) => item.id === itemId || selection.includes(item.id),
  );
  const merchant = items.find((item) => item.id === itemId);
  if (!merchant) return true;
  let best = Number.POSITIVE_INFINITY;
  for (const item of items) {
    if (item.id === itemId) continue;
    const distance = await OBR.scene.grid.getDistance(
      item.position,
      merchant.position,
    );
    if (typeof distance === "number") best = Math.min(best, distance);
  }
  if (best <= range) return true;
  toast(msg("shop.tooFar", { range }), "error");
  return false;
}

function mergeInventory(
  inventory: InventoryEntry[],
  item: ItemBase,
  quantity: number,
): InventoryEntry[] {
  const index = inventory.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [...inventory, toInventoryEntry(item, quantity)];
  const next = [...inventory];
  next[index] = { ...next[index], quantity: next[index].quantity + quantity };
  return next;
}

function mergeStock(
  stock: StockEntry[],
  item: ItemBase,
  quantity: number,
): StockEntry[] {
  const index = stock.findIndex(
    (entry) =>
      entry.name === item.name &&
      entry.price.amount === item.price.amount &&
      entry.price.currencyId === item.price.currencyId,
  );
  if (index === -1) return [...stock, { ...item, quantity }];
  const next = [...stock];
  const current = next[index];
  next[index] = {
    ...current,
    quantity: current.quantity < 0 ? -1 : current.quantity + quantity,
  };
  return next;
}

/* -------------------------------------------------------------------------- */
/* Comprar / Vender / Contratar                                               */
/* -------------------------------------------------------------------------- */

export async function buyItem(
  itemId: string,
  stockId: string,
  quantity: number,
): Promise<void> {
  const shop = getShop(itemId);
  if (!shop) return;
  const entry = shop.stock.find((stock) => stock.id === stockId);
  if (!entry) return;
  const currencies = state.settings.currencies;
  const wallet = myWallet();
  const qty = entry.quantity < 0 ? quantity : Math.min(quantity, entry.quantity);
  if (qty <= 0) {
    toast(msg("shop.outOfStock"), "error");
    return;
  }
  if (!(await withinRange(itemId))) return;

  const multiplier = shop.priceMultiplier * rarityMultiplier(shop, entry.rarity);
  const unit = priceToBase(entry.price, currencies) * multiplier;
  const cost = clean(unit * qty);

  const result = pay(wallet.money, cost, currencies);
  if (!result) {
    toast(msg("shop.insufficient"), "error");
    return;
  }

  const funds = shop.infiniteFunds
    ? shop.funds
    : addMoney(shop.funds, baseToMoney(cost, currencies));

  const ok = await updateShop(itemId, (draft) => {
    const target = draft.stock.find((stock) => stock.id === stockId);
    if (target && target.quantity > 0) {
      target.quantity = Math.max(0, target.quantity - qty);
    }
    draft.funds = funds;
  });

  await saveWallet({
    ...wallet,
    money: result.money,
    inventory: mergeInventory(wallet.inventory, entry, qty),
  });

  addLog({
    type: "buy",
    player: wallet.name,
    merchant: shop.name || getToken(itemId)?.name || "",
    amount: -cost,
    detail: `${qty}× ${entry.name}`,
  });

  if (!ok) {
    toast(msg("shop.noPermission"), "error");
    return;
  }
  toast(
    `${msg("shop.bought", { qty, name: entry.name })} ${msg("shop.paid", {
      amount: baseText(cost, currencies, state.lang),
    })}`,
    "success",
  );
}

export async function sellItem(
  itemId: string,
  inventoryId: string,
  quantity: number,
): Promise<void> {
  const shop = getShop(itemId);
  if (!shop) return;
  const wallet = myWallet();
  const entry = wallet.inventory.find((item) => item.id === inventoryId);
  if (!entry) return;
  const currencies = state.settings.currencies;
  const qty = Math.min(quantity, entry.quantity);
  if (qty <= 0) return;
  if (!(await withinRange(itemId))) return;

  const multiplier = shop.payoutMultiplier * rarityMultiplier(shop, entry.rarity);
  const unit = priceToBase(entry.price, currencies) * multiplier;
  const gain = clean(unit * qty);

  if (!shop.infiniteFunds && moneyToBase(shop.funds, currencies) + 1e-6 < gain) {
    toast(msg("shop.merchantBroke"), "error");
    return;
  }

  const funds = shop.infiniteFunds
    ? shop.funds
    : subtractMoney(shop.funds, baseToMoney(gain, currencies));

  const ok = await updateShop(itemId, (draft) => {
    draft.funds = funds;
    draft.stock = mergeStock(draft.stock, entry, qty);
  });

  const inventory =
    entry.quantity <= qty
      ? wallet.inventory.filter((item) => item.id !== inventoryId)
      : wallet.inventory.map((item) =>
          item.id === inventoryId
            ? { ...item, quantity: item.quantity - qty }
            : item,
        );

  await saveWallet({
    ...wallet,
    money: addMoney(wallet.money, baseToMoney(gain, currencies)),
    inventory,
  });

  addLog({
    type: "sell",
    player: wallet.name,
    merchant: shop.name || getToken(itemId)?.name || "",
    amount: gain,
    detail: `${qty}× ${entry.name}`,
  });

  if (!ok) {
    toast(msg("shop.noPermission"), "error");
    return;
  }
  toast(
    `${msg("shop.sold", { qty, name: entry.name })} ${msg("shop.received", {
      amount: baseText(gain, currencies, state.lang),
    })}`,
    "success",
  );
}

export async function hireService(
  itemId: string,
  serviceId: string,
): Promise<void> {
  const shop = getShop(itemId);
  if (!shop) return;
  const service = shop.services.find((entry) => entry.id === serviceId);
  if (!service || !service.active) return;
  const currencies = state.settings.currencies;
  const wallet = myWallet();
  if (!(await withinRange(itemId))) return;

  const cost = clean(priceToBase(service.price, currencies));
  const result = pay(wallet.money, cost, currencies);
  if (!result) {
    toast(msg("shop.insufficient"), "error");
    return;
  }

  const funds = shop.infiniteFunds
    ? shop.funds
    : addMoney(shop.funds, baseToMoney(cost, currencies));

  const merchantName = shop.name || getToken(itemId)?.name || "";
  await saveWallet({ ...wallet, money: result.money });

  const orders = [
    ...state.orders,
    {
      id: uid("ord"),
      merchantId: itemId,
      merchantName,
      serviceId: service.id,
      serviceName: service.name,
      playerId: wallet.id,
      playerName: wallet.name,
      price: service.price,
      createdAt: Date.now(),
      done: false,
    },
  ];
  await saveOrders(orders);

  void updateShop(itemId, (draft) => {
    draft.funds = funds;
  });

  addLog({
    type: "service",
    player: wallet.name,
    merchant: merchantName,
    amount: -cost,
    detail: service.name,
  });

  toast(
    `${msg("shop.hired", { name: service.name })} ${msg("shop.paid", {
      amount: baseText(cost, currencies, state.lang),
    })}`,
    "success",
  );
}

/* -------------------------------------------------------------------------- */
/* Carteira                                                                   */
/* -------------------------------------------------------------------------- */

export async function setWalletMoney(
  walletId: string,
  money: Money,
): Promise<void> {
  const wallet = state.wallets[walletId];
  if (!wallet) return;
  await saveWallet({
    ...wallet,
    money: normalizeMoney(money, state.settings.currencies),
  });
}

export async function adjustWalletMoney(
  walletId: string,
  delta: Money,
): Promise<void> {
  const wallet = state.wallets[walletId];
  if (!wallet) return;
  const next = addMoney(wallet.money, delta);
  await saveWallet({
    ...wallet,
    money: normalizeMoney(next, state.settings.currencies),
  });
  addLog({
    type: "adjust",
    player: wallet.name,
    merchant: state.role === "GM" ? msg("common.gm") : "",
    amount: moneyToBase(delta, state.settings.currencies),
    detail: "",
  });
}

export async function addInventoryItem(
  walletId: string,
  entry: InventoryEntry,
): Promise<void> {
  const wallet = state.wallets[walletId];
  if (!wallet) return;
  await saveWallet({
    ...wallet,
    inventory: mergeInventory(wallet.inventory, entry, entry.quantity),
  });
}

export async function updateInventoryItem(
  walletId: string,
  entryId: string,
  patch: Partial<InventoryEntry>,
): Promise<void> {
  const wallet = state.wallets[walletId];
  if (!wallet) return;
  await saveWallet({
    ...wallet,
    inventory: wallet.inventory.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry,
    ),
  });
}

export async function removeInventoryItem(
  walletId: string,
  entryId: string,
): Promise<void> {
  const wallet = state.wallets[walletId];
  if (!wallet) return;
  await saveWallet({
    ...wallet,
    inventory: wallet.inventory.filter((entry) => entry.id !== entryId),
  });
}

export async function transferMoney(
  fromId: string,
  toId: string,
  delta: Money,
): Promise<void> {
  const from = state.wallets[fromId];
  const to = state.wallets[toId];
  if (!from || !to) return;
  const currencies = state.settings.currencies;
  const next = { ...state.wallets };
  next[fromId] = {
    ...from,
    money: normalizeMoney(subtractMoney(from.money, delta), currencies),
  };
  next[toId] = {
    ...to,
    money: normalizeMoney(addMoney(to.money, delta), currencies),
  };
  await saveWallets(next);
  addLog({
    type: "transfer",
    player: `${from.name} → ${to.name}`,
    merchant: "",
    amount: moneyToBase(delta, currencies),
    detail: "",
  });
}
