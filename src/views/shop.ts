import {
  baseText,
  getCurrency,
  moneyHtml,
  priceToBase,
} from "../currency";
import { getDraft, getTarget } from "../editor";
import { RARITY_KEYS, rarityLabel, t } from "../i18n";
import { myWallet, state, type TokenInfo } from "../state";
import type {
  Currency,
  InventoryEntry,
  Lang,
  ServiceEntry,
  ShopTab,
  StockEntry,
} from "../types";
import {
  badge,
  btn,
  checkbox,
  empty,
  field,
  iconBtn,
  input,
  section,
  select,
  tabs,
  textarea,
  thumb,
} from "../ui";
import { clean, esc, formatNumber } from "../util";

export function canManage(token: TokenInfo | undefined): boolean {
  if (!token?.shop) return false;
  if (state.role === "GM") return true;
  return !!token.shop.allowPlayerManage && token.owner === state.playerId;
}

function unitPrice(
  price: { amount: number; currencyId: string },
  multiplier: number,
  currencies: Currency[],
): number {
  return clean(priceToBase(price, currencies) * multiplier);
}

function rarityMultiplier(token: TokenInfo, rarity: string): number {
  if (!rarity) return 1;
  const custom = token.shop?.rarityMultipliers?.[rarity as never];
  if (typeof custom === "number") return custom;
  return state.settings.rarityMultipliers[rarity as never] ?? 1;
}

function itemMeta(
  entry: { rarity: string; weight: number },
  lang: Lang,
): string {
  const parts: string[] = [];
  if (state.settings.showRarity && entry.rarity) {
    parts.push(badge(rarityLabel(lang, entry.rarity as never)));
  }
  if (entry.weight > 0) {
    parts.push(`<span class="muted">${formatNumber(entry.weight, lang, 2)} kg</span>`);
  }
  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/* Abas                                                                       */
/* -------------------------------------------------------------------------- */

export function renderShopTabs(token: TokenInfo, active: ShopTab): string {
  const lang = state.lang;
  const manage = canManage(token);
  const items: { id: ShopTab; label: string; active: boolean }[] = [
    { id: "buy", label: t(lang, "shop.buy"), active: active === "buy" },
    { id: "sell", label: t(lang, "shop.sell"), active: active === "sell" },
    { id: "services", label: t(lang, "shop.services"), active: active === "services" },
  ];
  if (manage) {
    items.push({
      id: "manage",
      label: t(lang, "shop.manage"),
      active: active === "manage",
    });
  }
  return tabs(items, "shop-tab");
}

export function renderBuyTab(token: TokenInfo): string {
  const lang = state.lang;
  const shop = token.shop!;
  const currencies = state.settings.currencies;
  const stock = shop.stock.filter((entry) => entry.name);

  if (!stock.length) return empty(t(lang, "shop.noItems"));

  return `<div class="list">${stock
    .map((entry) => {
      const multiplier = shop.priceMultiplier * rarityMultiplier(token, entry.rarity);
      const price = unitPrice(entry.price, multiplier, currencies);
      const soldOut = entry.quantity === 0;
      const stockLabel =
        entry.quantity < 0
          ? `<span class="muted">${esc(t(lang, "common.infinite"))}</span>`
          : `<span class="muted">${entry.quantity}</span>`;
      return `<article class="item${soldOut ? " dim" : ""}">
        ${thumb(entry.icon, entry.name)}
        <div class="item-main">
          <div class="item-title">${esc(entry.name)}</div>
          ${entry.description ? `<div class="item-desc">${esc(entry.description)}</div>` : ""}
          <div class="item-meta">
            <strong class="price">${esc(baseText(price, currencies, lang))}</strong>
            ${stockLabel}
            ${itemMeta(entry, lang)}
          </div>
        </div>
        <div class="item-side">
          <input type="number" class="input qty" value="1" min="1" step="1" data-qty-for="${esc(entry.id)}" />
          ${btn({
            label: t(lang, "shop.buy"),
            action: "buy",
            id: entry.id,
            kind: "primary",
            disabled: soldOut,
          })}
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

export function renderSellTab(token: TokenInfo): string {
  const lang = state.lang;
  const shop = token.shop!;
  const currencies = state.settings.currencies;
  const wallet = myWallet();

  if (!wallet.inventory.length) return empty(t(lang, "shop.sellEmpty"));

  return `<div class="list">${wallet.inventory
    .map((entry) => {
      const multiplier = shop.payoutMultiplier * rarityMultiplier(token, entry.rarity);
      const price = unitPrice(entry.price, multiplier, currencies);
      return `<article class="item">
        ${thumb(entry.icon, entry.name)}
        <div class="item-main">
          <div class="item-title">${esc(entry.name)}${
            entry.quantity > 1 ? ` ×${esc(entry.quantity)}` : ""
          }</div>
          <div class="item-meta">
            <strong class="price pos">${esc(baseText(price, currencies, lang))}</strong>
            ${itemMeta(entry, lang)}
          </div>
        </div>
        <div class="item-side">
          <input type="number" class="input qty" value="1" min="1" max="${entry.quantity}" step="1" data-qty-for="sell_${esc(entry.id)}" />
          ${btn({ label: t(lang, "shop.sell"), action: "sell", id: entry.id, kind: "success" })}
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

export function renderServicesTab(token: TokenInfo): string {
  const lang = state.lang;
  const shop = token.shop!;
  const currencies = state.settings.currencies;
  const active = shop.services.filter((service) => service.active && service.name);

  if (!active.length) return empty(t(lang, "shop.servicesEmpty"));

  return `<div class="list">${active
    .map(
      (service) => `<article class="item">
        ${thumb(service.icon, service.name)}
        <div class="item-main">
          <div class="item-title">${esc(service.name)}</div>
          ${service.description ? `<div class="item-desc">${esc(service.description)}</div>` : ""}
          <div class="item-meta">
            <strong class="price">${esc(
              baseText(priceToBase(service.price, currencies), currencies, lang),
            )}</strong>
          </div>
        </div>
        <div class="item-side">
          ${btn({ label: t(lang, "shop.services"), action: "hire", id: service.id, kind: "primary" })}
        </div>
      </article>`,
    )
    .join("")}</div>`;
}

/* -------------------------------------------------------------------------- */
/* Gerenciar                                                                  */
/* -------------------------------------------------------------------------- */

export function renderManageTab(token: TokenInfo): string {
  const lang = state.lang;
  const shop = token.shop!;
  const currencies = state.settings.currencies;
  const editing = getTarget();

  const editor = editing
    ? renderEditor(editing.kind, getDraft(), currencies)
    : "";

  const general = section(
    t(lang, "common.name"),
    `<div class="grid2">
      ${field(
        t(lang, "shop.name"),
        input({ field: "shop-name", value: shop.name, action: "shop-field", id: token.id, placeholder: token.name }),
      )}
    </div>
    ${field(
      t(lang, "shop.greeting"),
      textarea({ field: "shop-greeting", value: shop.greeting, rows: 2, action: "shop-field", id: token.id }),
    )}
    <div class="grid2">
      ${field(
        t(lang, "shop.priceMultiplier"),
        input({ field: "shop-price", type: "number", value: shop.priceMultiplier, step: 0.05, min: 0, action: "shop-field", id: token.id }),
      )}
      ${field(
        t(lang, "shop.payoutMultiplier"),
        input({ field: "shop-payout", type: "number", value: shop.payoutMultiplier, step: 0.05, min: 0, action: "shop-field", id: token.id }),
      )}
    </div>
    <div class="row wrap">
      ${checkbox({ field: "shop-enabled", checked: shop.enabled, label: t(lang, "shop.enable"), id: token.id, action: "shop-toggle" })}
      ${checkbox({ field: "shop-infinite", checked: shop.infiniteFunds, label: t(lang, "shop.infiniteFunds"), id: token.id, action: "shop-toggle" })}
      ${checkbox({ field: "shop-allow-owner", checked: shop.allowPlayerManage, label: t(lang, "shop.allowPlayerManage"), id: token.id, action: "shop-toggle" })}
    </div>`,
  );

  const funds = section(
    t(lang, "shop.fundsEditor"),
    `<div class="money-grid">
      ${currencies
        .map((currency) => {
          const value = shop.funds[currency.id] ?? 0;
          return `<div class="money-cell" style="--coin:${esc(currency.color)}">
            <span class="coin-dot"></span>
            <span class="coin-name">${esc(currency.name)}</span>
            ${input({
              field: "shop-funds",
              id: currency.id,
              type: "number",
              value,
              min: 0,
              step: currency.decimals > 0 ? 10 ** -currency.decimals : 1,
              action: "shop-fund",
              className: "input small",
            })}
          </div>`;
        })
        .join("")}
    </div>
    <div class="row between">
      <span class="muted">${esc(t(lang, "wallet.totalValue"))}: ${esc(
        baseText(
          currencies.reduce(
            (total, currency) => total + (shop.funds[currency.id] ?? 0) * currency.rate,
            0,
          ),
          currencies,
          lang,
        ),
      )}</span>
    </div>`,
  );

  const stockList = section(
    t(lang, "shop.stock"),
    shop.stock.length
      ? `<div class="list">${shop.stock
          .map(
            (entry) => `<article class="item compact">
            ${thumb(entry.icon, entry.name)}
            <div class="item-main">
              <div class="item-title">${esc(entry.name || "—")}</div>
              <div class="item-meta">
                <span class="price">${esc(
                  baseText(
                    priceToBase(entry.price, currencies),
                    currencies,
                    lang,
                  ),
                )}</span>
                <span class="muted">${
                  entry.quantity < 0
                    ? esc(t(lang, "common.infinite"))
                    : `×${entry.quantity}`
                }</span>
                ${itemMeta(entry, lang)}
              </div>
            </div>
            <div class="item-side">
              ${iconBtn({ action: "edit-stock", id: entry.id, iconName: "edit", title: t(lang, "common.edit") })}
              ${iconBtn({ action: "delete-stock", id: entry.id, iconName: "trash", title: t(lang, "common.delete"), confirm: t(lang, "common.confirmDelete") })}
            </div>
          </article>`,
          )
          .join("")}</div>`
      : empty(t(lang, "shop.stockEmpty")),
    { actions: btn({ label: t(lang, "shop.addItem"), action: "new-stock", iconName: "plus" }) },
  );

  const serviceList = section(
    t(lang, "shop.services"),
    shop.services.length
      ? `<div class="list">${shop.services
          .map(
            (service) => `<article class="item compact${service.active ? "" : " dim"}">
            ${thumb(service.icon, service.name)}
            <div class="item-main">
              <div class="item-title">${esc(service.name || "—")}</div>
              <div class="item-meta">
                <span class="price">${esc(
                  baseText(priceToBase(service.price, currencies), currencies, lang),
                )}</span>
                ${service.active ? "" : badge(t(lang, "common.disabled2"))}
              </div>
            </div>
            <div class="item-side">
              ${iconBtn({ action: "edit-service", id: service.id, iconName: "edit", title: t(lang, "common.edit") })}
              ${iconBtn({ action: "delete-service", id: service.id, iconName: "trash", title: t(lang, "common.delete"), confirm: t(lang, "common.confirmDelete") })}
            </div>
          </article>`,
          )
          .join("")}</div>`
      : empty(t(lang, "shop.servicesEmpty")),
    { actions: btn({ label: t(lang, "shop.addService"), action: "new-service", iconName: "plus" }) },
  );

  const wallet = myWallet();
  const quickAdd = wallet.inventory.length
    ? section(
        t(lang, "shop.quickAddFromInventory"),
        `<div class="list">${wallet.inventory
          .map(
            (entry) => `<article class="item compact">
            ${thumb(entry.icon, entry.name)}
            <div class="item-main"><div class="item-title">${esc(entry.name)}</div></div>
            <div class="item-side">
              ${btn({ label: t(lang, "common.add"), action: "stock-from-inventory", id: entry.id })}
            </div>
          </article>`,
          )
          .join("")}</div>`,
      )
    : "";

  const raritySection = section(
    t(lang, "shop.rarityMultipliers"),
    `<div class="grid2">${RARITY_KEYS.map((key) =>
      field(
        rarityLabel(lang, key),
        input({
          field: "shop-rarity",
          id: key,
          type: "number",
          value:
            shop.rarityMultipliers?.[key] ??
            state.settings.rarityMultipliers[key] ??
            1,
          step: 0.05,
          min: 0,
          action: "shop-rarity",
        }),
      ),
    ).join("")}</div>
    <div class="row wrap">
      ${btn({ label: t(lang, "shop.copyFromGlobal"), action: "shop-rarity-reset" })}
    </div>`,
  );

  const danger = `<div class="row wrap">
    ${btn({
      label: t(lang, "common.delete") + " · " + t(lang, "app.title"),
      action: "delete-shop",
      id: token.id,
      kind: "danger",
      confirm: t(lang, "common.confirmDelete"),
    })}
  </div>`;

  const library = section("Biblioteca", `<div class="list">${state.catalog.items.map((item) => `<article class="item compact"><div class="item-main"><div class="item-title">${esc(item.name || "Item")}</div></div><div class="item-side">${btn({label:"Adicionar",action:"add-catalog-item-to-shop",id:item.id,kind:"primary"})}</div></article>`).join("")}${state.catalog.services.map((service) => `<article class="item compact"><div class="item-main"><div class="item-title">${esc(service.name || "Serviço")}</div></div><div class="item-side">${btn({label:"Adicionar",action:"add-catalog-service-to-shop",id:service.id,kind:"primary"})}</div></article>`).join("")}</div>`, { hint: "Itens e serviços adicionados daqui são referências leves à biblioteca." });
  return editor + general + funds + stockList + serviceList + library + quickAdd + raritySection + danger;
}

/* -------------------------------------------------------------------------- */
/* Editor de item / servico                                                   */
/* -------------------------------------------------------------------------- */

export function renderEditor(
  kind: "stock" | "service" | "inventory" | "catalog-item" | "catalog-service",
  draft: StockEntry | ServiceEntry | InventoryEntry | import("../types").CatalogItem | import("../types").CatalogService | null,
  currencies: Currency[],
): string {
  if (!draft) return "";
  const lang = state.lang;
  const isService = kind === "service" || kind === "catalog-service";
  const entry = draft as StockEntry;
  const title = isService
    ? entry.id
      ? t(lang, "shop.editService")
      : t(lang, "shop.newService")
    : entry.id && (kind === "stock" || kind === "catalog-item")
      ? t(lang, "shop.editItem")
      : t(lang, "shop.newItem");

  const currencyOptions = currencies.map((currency) => ({
    value: currency.id,
    label: `${currency.name} (${currency.symbol})`,
  }));

  return `<section class="section editor">
    <header class="section-head"><h2>${esc(title)}</h2></header>
    <div class="grid2">
      ${field(t(lang, "common.name"), input({ field: "edit", editField: "name", value: draft.name }))}
      ${field(
        t(lang, "common.price"),
        `<div class="row">
          ${input({ field: "edit", editField: "price.amount", type: "number", value: draft.price.amount, step: 0.01, min: 0, className: "input" })}
          ${select({
            field: "edit",
            editField: "price.currencyId",
            value: draft.price.currencyId,
            options: currencyOptions,
            className: "input",
          })}
        </div>`,
      )}
    </div>
    ${field(
      t(lang, "common.description"),
      textarea({ field: "edit", editField: "description", value: draft.description, rows: 2 }),
    )}
    ${field(t(lang, "common.icon"), input({ field: "edit", editField: "icon", value: draft.icon, placeholder: "https://…" }))}
    ${
      isService
        ? checkbox({ field: "edit", editField: "active", checked: (draft as ServiceEntry).active, label: t(lang, "shop.serviceActive") })
        : `<div class="grid2">
            ${field(
              t(lang, "common.rarity"),
              select({
                field: "edit",
                editField: "rarity",
                value: entry.rarity ?? "",
                options: [
                  { value: "", label: t(lang, "rarity.none") },
                  ...RARITY_KEYS.map((key) => ({
                    value: key,
                    label: rarityLabel(lang, key),
                  })),
                ],
              }),
            )}
            ${field(
              t(lang, "common.weight"),
              input({ field: "edit", editField: "weight", type: "number", value: entry.weight, min: 0, step: 0.1 }),
            )}
            ${kind === "catalog-item" ? "" : field(
              kind === "stock" ? t(lang, "shop.stockQuantity") : t(lang, "common.quantity"),
              input({ field: "edit", editField: "quantity", type: "number", value: entry.quantity, step: 1 }),
            )}
          </div>`
    }
    <div class="row wrap">
      ${btn({ label: t(lang, "common.save"), action: "save-edit", kind: "primary" })}
      ${btn({ label: t(lang, "common.cancel"), action: "cancel-edit" })}
    </div>
  </section>`;
}

export function renderMerchantFunds(token: TokenInfo): string {
  return moneyHtml(token.shop?.funds ?? {}, state.settings.currencies, state.lang, {
    compact: true,
  });
}

export function renderCurrencyHint(currencyId: string): string {
  const currency = getCurrency(state.settings.currencies, currencyId);
  return currency ? `${currency.name} · ${currency.symbol}` : "";
}
