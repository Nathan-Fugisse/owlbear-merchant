import { baseText, defaultCurrencies } from "../currency";
import { RARITY_KEYS, rarityLabel, t } from "../i18n";
import { localStorageSize, state } from "../state";
import type { Currency, Lang } from "../types";
import { btn, checkbox, empty, field, input, section } from "../ui";
import { esc, formatBytes, formatDateTime, uid } from "../util";


function currencyCard(currency: Currency, index: number, total: number): string {
  const lang = state.lang;
  return `<article class="card">
    <header class="card-head">
      <span class="coin-dot big" style="background:${esc(currency.color)}"></span>
      <strong>${esc(currency.name || currency.id)}</strong>
      <span class="muted">${esc(currency.symbol)}</span>
      <div class="card-actions">
        ${input({ field: "currency-color", id: currency.id, type: "color", value: currency.color, className: "input color" })}
        <button type="button" class="btn icon-only ghost" data-action="move-currency" data-id="${esc(currency.id)}" data-value="up" title="${esc(t(lang, "common.moveUp"))}"${index === 0 ? " disabled" : ""}><svg class="ico" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
        <button type="button" class="btn icon-only ghost" data-action="move-currency" data-id="${esc(currency.id)}" data-value="down" title="${esc(t(lang, "common.moveDown"))}"${index === total - 1 ? " disabled" : ""}><svg class="ico" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
        <button type="button" class="btn icon-only danger" data-action="delete-currency" data-id="${esc(currency.id)}" title="${esc(t(lang, "common.delete"))}" data-confirm="${esc(t(lang, "common.confirmDelete"))}"><svg class="ico" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </div>
    </header>
    <div class="grid2">
      ${field(
        t(lang, "settings.currencyName"),
        input({ field: "currency-name", id: currency.id, value: currency.name }),
      )}
      ${field(
        t(lang, "settings.currencyPlural"),
        input({ field: "currency-plural", id: currency.id, value: currency.plural }),
      )}
      ${field(
        t(lang, "settings.currencySymbol"),
        input({ field: "currency-symbol", id: currency.id, value: currency.symbol }),
      )}
      ${field(
        t(lang, "settings.currencyRate"),
        input({ field: "currency-rate", id: currency.id, type: "number", value: currency.rate, min: 0.0001, step: 1 }),
      )}
      ${field(
        t(lang, "settings.currencyDecimals"),
        input({ field: "currency-decimals", id: currency.id, type: "number", value: currency.decimals, min: 0, max: 4, step: 1 }),
      )}
    </div>
  </article>`;
}

function presets(lang: Lang): string {
  const single: Currency[] =
    lang === "en"
      ? [
          {
            id: "credit",
            name: "Credit",
            plural: "Credits",
            symbol: "cr",
            color: "#8fd18f",
            rate: 1,
            decimals: 0,
          },
        ]
      : [
          {
            id: "credito",
            name: "Crédito",
            plural: "Créditos",
            symbol: "CR",
            color: "#8fd18f",
            rate: 1,
            decimals: 0,
          },
        ];
  const two = defaultCurrencies(lang).slice(0, 2).map((currency, index) => ({
    ...currency,
    rate: index === 0 ? 10 : 1,
  }));
  return JSON.stringify({
    dnd: defaultCurrencies(lang),
    single,
    two,
  });
}

export function renderSettings(): string {
  const lang = state.lang;
  const settings = state.settings;
  const currencies = settings.currencies;

  const currencySection = section(
    t(lang, "settings.currency"),
    `<div class="list cards">${currencies
      .map((currency, index) => currencyCard(currency, index, currencies.length))
      .join("")}</div>
     <div class="row wrap">
       ${btn({ label: t(lang, "settings.addCurrency"), action: "add-currency", iconName: "plus" })}
       <span class="spacer"></span>
       <span class="muted">${esc(t(lang, "settings.presets"))}</span>
       ${btn({ label: t(lang, "settings.preset.dnd"), action: "preset", value: "dnd" })}
       ${btn({ label: t(lang, "settings.preset.two"), action: "preset", value: "two" })}
       ${btn({ label: t(lang, "settings.preset.single"), action: "preset", value: "single" })}
     </div>`,
    { hint: t(lang, "settings.currencyHint") },
  );

  const economySection = section(
    t(lang, "settings.economy"),
    `<div class="grid2">
       ${field(
         t(lang, "settings.priceMultiplier"),
         input({ field: "setting-price", type: "number", value: settings.defaultPriceMultiplier, step: 0.05, min: 0 }),
       )}
       ${field(
         t(lang, "settings.payoutMultiplier"),
         input({ field: "setting-payout", type: "number", value: settings.defaultPayoutMultiplier, step: 0.05, min: 0 }),
       )}
       <div class="field-inline">
         ${checkbox({ field: "setting-showRarity", checked: settings.showRarity, label: t(lang, "settings.showRarity") })}
       </div>
     </div>`,
  );

  const raritySection = section(
    t(lang, "settings.rarityMultipliers"),
    `<div class="grid2">${RARITY_KEYS.map((key) =>
      field(
        rarityLabel(lang, key),
        input({
          field: "rarity-mult",
          id: key,
          type: "number",
          value: settings.rarityMultipliers[key],
          step: 0.05,
          min: 0,
        }),
      ),
    ).join("")}</div>`,
  );

  const size = localStorageSize();
  const storageSection = section(
    t(lang, "settings.storage"),
    `<div class="row between">
       <span>${esc(t(lang, "settings.storageSize", { size: formatBytes(size) }))}</span>
       <span class="muted">Local</span>
     </div>
     <p class="muted">${esc(t(lang, "settings.storageHint"))}</p>
     <div class="row wrap">
       ${btn({ label: t(lang, "settings.clearLog"), action: "clear-log" })}
       ${btn({ label: t(lang, "settings.clearWallets"), action: "clear-absent" })}
     </div>`,
  );

  const logSection = section(
    t(lang, "settings.log"),
    settings.log.length
      ? `<div class="list">${settings.log
          .map(
            (entry) => `<article class="item compact">
              <div class="item-main">
                <div class="item-title">${esc(
                  `${t(lang, `log.${entry.type}`)} · ${entry.detail || "—"}`,
                )}</div>
                <div class="item-meta">
                  <span>${esc(entry.player || "—")}</span>
                  ${entry.merchant ? `<span>· ${esc(entry.merchant)}</span>` : ""}
                  <span class="muted">· ${esc(formatDateTime(entry.at, lang))}</span>
                </div>
              </div>
              <div class="item-side">
                <span class="${entry.amount >= 0 ? "pos" : "neg"}">${esc(
                  `${entry.amount >= 0 ? "+" : ""}${baseText(Math.abs(entry.amount), currencies, lang)}`,
                )}</span>
              </div>
            </article>`,
          )
          .join("")}</div>`
      : empty(t(lang, "settings.logEmpty")),
  );

  const backupSection = section(
    t(lang, "settings.backup"),
    `<div class="row wrap">
       ${btn({ label: t(lang, "settings.export"), action: "export-json", iconName: "copy", kind: "primary" })}
     </div>`,
    { hint: t(lang, "settings.backupHint") },
  );

  const dangerSection = section(
    t(lang, "settings.danger"),
    `<div class="row wrap">
       ${btn({
         label: t(lang, "settings.resetAll"),
         action: "reset-all",
         kind: "danger",
         confirm: t(lang, "settings.resetAllConfirm"),
       })}
     </div>`,
  );

  return (
    currencySection +
    economySection +
    raritySection +
    storageSection +
    logSection +
    backupSection +
    dangerSection
  );
}

export function getPresets(lang: Lang): Record<string, Currency[]> {
  return JSON.parse(presets(lang)) as Record<string, Currency[]>;
}

export function newCurrencyId(): string {
  return uid("cur");
}
