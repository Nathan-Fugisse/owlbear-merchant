import { baseText, defaultCurrencies } from "../currency";
import { getDraft, getTarget } from "../editor";
import { RARITY_KEYS, rarityLabel, t } from "../i18n";
import { state } from "../state";
import { renderEditor } from "./shop";
import type { Currency, Lang } from "../types";
import { btn, checkbox, empty, field, input, section } from "../ui";
import { esc, formatDateTime, uid } from "../util";

let backupText = "";

export function setBackupText(value: string): void {
  backupText = value;
}

export function getBackupText(): string {
  return backupText;
}

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

  const catalogItems = state.catalog.items;
  const catalogServices = state.catalog.services;
  const catalogSection = section(
    "Biblioteca de itens e serviços",
    `<p class="muted">Crie aqui modelos reutilizáveis. Um mercador guarda apenas uma referência ao modelo e a quantidade, em vez de duplicar todos os dados.</p>
     <div class="row wrap">
       ${btn({ label: "Novo item", action: "new-catalog-item", iconName: "plus" })}
       ${btn({ label: "Novo serviço", action: "new-catalog-service", iconName: "plus" })}
     </div>
     <h3>Itens</h3>
     ${catalogItems.length ? `<div class="list cards">${catalogItems.map((item) => `<article class="card"><header class="card-head"><strong>${esc(item.name || "Item sem nome")}</strong><div class="card-actions">${btn({label:"Editar",action:"edit-catalog-item",id:item.id})}${btn({label:"Excluir",action:"delete-catalog-item",id:item.id,kind:"danger",confirm:"Excluir este modelo?"})}</div></header><div class="item-meta">${esc(item.description || "Sem descrição")} · ${esc(String(item.price.amount))} ${esc(item.price.currencyId)}</div></article>`).join("")}</div>` : empty("Nenhum item na biblioteca.")}
     <h3>Serviços</h3>
     ${catalogServices.length ? `<div class="list cards">${catalogServices.map((service) => `<article class="card"><header class="card-head"><strong>${esc(service.name || "Serviço sem nome")}</strong><div class="card-actions">${btn({label:"Editar",action:"edit-catalog-service",id:service.id})}${btn({label:"Excluir",action:"delete-catalog-service",id:service.id,kind:"danger",confirm:"Excluir este modelo?"})}</div></header><div class="item-meta">${esc(service.description || "Sem descrição")} · ${esc(String(service.price.amount))} ${esc(service.price.currencyId)}</div></article>`).join("")}</div>` : empty("Nenhum serviço na biblioteca.")}
     ${getTarget()?.kind === "catalog-item" || getTarget()?.kind === "catalog-service" ? renderEditor(getTarget()!.kind, getDraft() as any, state.settings.currencies) : ""}`,
    { hint: "Os modelos ficam no localStorage e podem ser reutilizados em vários mercadores." },
  );

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

  const storageSection = section(
    "Armazenamento local",
    `<p class="muted">Os dados da extensão ficam no armazenamento local do navegador, separados por sala. Eles não ocupam o Room Metadata do Owlbear Rodeo.</p>
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
    `<p class="muted">Gere um arquivo JSON para guardar uma cópia completa dos seus dados. A importação substitui os dados locais desta sala.</p>
     <div class="row wrap">
       ${btn({ label: "Baixar backup JSON", action: "export-json", iconName: "copy" })}
       ${btn({ label: "Restaurar backup JSON", action: "import-json", kind: "primary" })}
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
    catalogSection +
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
