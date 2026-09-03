import { priceHtml } from "../currency";
import { t } from "../i18n";
import { state } from "../state";
import { btn, empty, section } from "../ui";
import { esc, formatDateTime } from "../util";

export function renderOrders(): string {
  const lang = state.lang;
  const isGm = state.role === "GM";
  const currencies = state.settings.currencies;
  const all = state.orders
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((order) => isGm || order.playerId === state.playerId);

  const pending = all.filter((order) => !order.done);
  const done = all.filter((order) => order.done);

  const card = (order: (typeof all)[number]) => `<article class="item compact">
      <div class="item-main">
        <div class="item-title">${esc(order.serviceName)}</div>
        <div class="item-meta">
          <span>${esc(t(lang, "orders.by", { player: order.playerName }))}</span>
          <span>·</span>
          <span>${esc(t(lang, "orders.at", { merchant: order.merchantName }))}</span>
          <span>·</span>
          <span class="muted">${esc(formatDateTime(order.createdAt, lang))}</span>
        </div>
      </div>
      <div class="item-side">
        ${priceHtml(order.price, currencies, lang)}
        ${
          isGm
            ? btn({
                label: order.done ? t(lang, "orders.reopen") : t(lang, "orders.doneBtn"),
                action: order.done ? "order-reopen" : "order-done",
                id: order.id,
                kind: order.done ? "ghost" : "success",
              }) +
              btn({
                label: t(lang, "common.delete"),
                action: "order-delete",
                id: order.id,
                kind: "danger",
                confirm: t(lang, "common.confirmDelete"),
              })
            : ""
        }
      </div>
    </article>`;

  const pendingSection = section(
    t(lang, "orders.pending"),
    pending.length ? `<div class="list">${pending.map(card).join("")}</div>` : empty(t(lang, "orders.empty")),
  );

  const doneSection = done.length
    ? section(
        t(lang, "orders.done"),
        `<div class="list">${done.map(card).join("")}</div>`,
      )
    : "";

  return pendingSection + doneSection;
}
