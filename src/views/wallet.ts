import { moneyHtml, moneyToBase, baseText } from "../currency";
import { t } from "../i18n";
import { state, viewedWallet } from "../state";
import { btn, empty, input, section, thumb, iconBtn } from "../ui";
import { esc, formatNumber } from "../util";

export function renderWallet(): string {
  const lang = state.lang;
  const isGm = state.role === "GM";
  const currencies = state.settings.currencies;
  const wallet = viewedWallet();
  const ownerOptions = Object.values(state.wallets)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const ownerPicker = isGm
    ? `<div class="row">
        <select class="input" data-field="wallet-owner">
          ${ownerOptions
            .map(
              (option) =>
                `<option value="${esc(option.id)}"${
                  option.id === wallet.id ? " selected" : ""
                }>${esc(option.name)}${
                  option.id === state.playerId
                    ? ` (${esc(t(lang, "common.you"))})`
                    : ""
                }</option>`,
            )
            .join("")}
        </select>
      </div>
      <p class="section-hint">${esc(t(lang, "wallet.gmHint"))}</p>`
    : "";

  const moneyEditor = `<div class="money-grid">
    ${currencies
      .map((currency) => {
        const value = wallet.money[currency.id] ?? 0;
        return `<div class="money-cell" style="--coin:${esc(currency.color)}">
          <span class="coin-dot"></span>
          <span class="coin-name">${esc(currency.name)}</span>
          <span class="coin-symbol">${esc(currency.symbol)}</span>
          ${input({
            field: "wallet-money",
            id: currency.id,
            type: "number",
            value: value,
            step: currency.decimals > 0 ? 10 ** -currency.decimals : 1,
            min: 0,
            className: "input small",
          })}
        </div>`;
      })
      .join("")}
  </div>`;

  const total = moneyToBase(wallet.money, currencies);

  const inventory = wallet.inventory.length
    ? `<div class="list">${wallet.inventory
        .map((entry) => {
          const unit = entry.price;
          return `<article class="item">
            ${thumb(entry.icon, entry.name)}
            <div class="item-main">
              <div class="item-title">${esc(entry.name)}${
                entry.quantity > 1 ? ` ×${esc(entry.quantity)}` : ""
              }</div>
              ${entry.description ? `<div class="item-desc">${esc(entry.description)}</div>` : ""}
              <div class="item-meta">
                ${moneyHtml({ [unit.currencyId]: unit.amount }, currencies, lang)}
                ${entry.weight > 0 ? `<span class="muted">${formatNumber(entry.weight, lang, 2)} kg</span>` : ""}
              </div>
            </div>
            <div class="item-side">
              ${iconBtn({ action: "edit-inventory", id: entry.id, iconName: "edit", title: t(lang, "common.edit") })}
              ${iconBtn({ action: "delete-inventory", id: entry.id, iconName: "trash", title: t(lang, "common.delete"), confirm: t(lang, "common.confirmDelete") })}
            </div>
          </article>`;
        })
        .join("")}</div>`
    : empty(t(lang, "wallet.inventoryEmpty"));

  return `
    ${section(
      t(lang, "wallet.title"),
      `${ownerPicker}
       ${moneyEditor}
       <div class="row between">
         <span class="muted">${esc(t(lang, "wallet.totalValue"))}: ${esc(baseText(total, currencies, lang))}</span>
       </div>`,
    )}
    ${section(
      t(lang, "wallet.inventory"),
      inventory,
      { actions: btn({ label: t(lang, "common.add"), action: "new-inventory", id: wallet.id, iconName: "plus" }) },
    )}
  `;
}
