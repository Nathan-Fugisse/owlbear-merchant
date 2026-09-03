import { moneyHtml } from "../currency";
import { t } from "../i18n";
import { state } from "../state";
import { badge, btn, empty, input, section, thumb } from "../ui";
import { esc } from "../util";

export function renderShops(): string {
  const lang = state.lang;
  const isGm = state.role === "GM";
  const term = state.search.trim().toLowerCase();
  const match = (value: string) => !term || value.toLowerCase().includes(term);

  const merchants = state.tokens.filter(
    (token) => token.shop?.enabled && match(token.shop.name || token.name),
  );
  const available = state.tokens.filter(
    (token) => !token.shop?.enabled && match(token.name),
  );

  if (!state.sceneReady) {
    return section(
      t(lang, "shops.title"),
      empty(t(lang, "app.notInRoom")),
      { hint: t(lang, "shops.hint") },
    );
  }

  const merchantList = merchants.length
    ? `<div class="list">${merchants
        .map((token) => {
          const shop = token.shop!;
          const name = shop.name || token.name;
          return `<article class="item">
            ${thumb(token.image, name)}
            <div class="item-main">
              <div class="item-title">${esc(name)}</div>
              <div class="item-meta">
                ${badge(t(lang, "shops.items", { count: shop.stock.length }))}
                ${badge(t(lang, "shops.services", { count: shop.services.length }))}
                ${
                  isGm && !shop.infiniteFunds
                    ? moneyHtml(shop.funds, state.settings.currencies, lang, {
                        compact: true,
                      })
                    : ""
                }
              </div>
              ${
                shop.greeting
                  ? `<div class="item-desc">${esc(shop.greeting)}</div>`
                  : ""
              }
            </div>
            <div class="item-side">
              ${btn({
                label: t(lang, "shops.open"),
                action: "open-shop",
                id: token.id,
                kind: "primary",
              })}
              ${
                isGm
                  ? btn({
                      label: t(lang, "shops.manage"),
                      action: "open-manage",
                      id: token.id,
                    })
                  : ""
              }
            </div>
          </article>`;
        })
        .join("")}</div>`
    : empty(t(lang, "shops.empty"));

  const availableList = isGm
    ? section(
        t(lang, "shops.available"),
        available.length
          ? `<div class="list">${available
              .map(
                (token) => `<article class="item compact">
              ${thumb(token.image, token.name)}
              <div class="item-main">
                <div class="item-title">${esc(token.name)}</div>
              </div>
              <div class="item-side">
                ${btn({
                  label: token.shop
                    ? t(lang, "shops.reactivateShop")
                    : t(lang, "shops.makeShop"),
                  action: "create-shop",
                  id: token.id,
                })}
              </div>
            </article>`,
              )
              .join("")}</div>`
          : empty(t(lang, "shops.availableEmpty")),
      )
    : "";

  return `
    ${section(t(lang, "shops.title"), merchantList, {
      actions: input({
        field: "search",
        value: state.search,
        placeholder: t(lang, "common.search"),
        className: "input search",
      }),
      hint: t(lang, "shops.hint"),
    })}
    ${availableList}
  `;
}
