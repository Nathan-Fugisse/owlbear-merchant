import type { Currency, Lang, Money, Price } from "./types";
import { clean, esc, formatNumber, round } from "./util";

const EPS = 1e-6;

/** Moedas ordenadas da mais valiosa para a menos valiosa. */
export function sortedCurrencies(currencies: Currency[]): Currency[] {
  return [...currencies].sort((a, b) => b.rate - a.rate);
}

export function getCurrency(
  currencies: Currency[],
  id: string | undefined,
): Currency | undefined {
  return currencies.find((currency) => currency.id === id);
}

export function mainCurrency(currencies: Currency[]): Currency | undefined {
  return sortedCurrencies(currencies)[0];
}

export function emptyMoney(currencies: Currency[]): Money {
  const money: Money = {};
  for (const currency of currencies) money[currency.id] = 0;
  return money;
}

/** Remove entradas zeradas/invalidas e normaliza decimais. */
export function normalizeMoney(money: Money, currencies: Currency[]): Money {
  const result: Money = {};
  for (const currency of currencies) {
    const raw = money?.[currency.id] ?? 0;
    const value = round(raw, currency.decimals);
    if (value !== 0) result[currency.id] = value;
  }
  return result;
}

export function moneyToBase(money: Money, currencies: Currency[]): number {
  let total = 0;
  for (const currency of currencies) {
    total += (money?.[currency.id] ?? 0) * currency.rate;
  }
  return clean(total);
}

/** Distribui um valor em unidades base pelas denominacoes (maior primeiro). */
export function baseToMoney(base: number, currencies: Currency[]): Money {
  const result: Money = {};
  let remaining = clean(Math.max(0, base));
  for (const currency of sortedCurrencies(currencies)) {
    if (remaining < EPS || currency.rate <= 0) continue;
    const count = Math.floor(remaining / currency.rate + EPS);
    if (count > 0) {
      result[currency.id] = count;
      remaining = clean(remaining - count * currency.rate);
    }
  }
  // Sobra (taxas nao multiplas) vai para a menor denominacao
  if (remaining > EPS) {
    const smallest = sortedCurrencies(currencies).slice(-1)[0];
    if (smallest) {
      result[smallest.id] = clean((result[smallest.id] ?? 0) + remaining / smallest.rate);
    }
  }
  for (const currency of currencies) {
    if (result[currency.id] !== undefined) {
      result[currency.id] = round(result[currency.id], currency.decimals);
      if (result[currency.id] === 0) delete result[currency.id];
    }
  }
  return result;
}

export function addMoney(a: Money, b: Money): Money {
  const result: Money = { ...a };
  for (const [id, value] of Object.entries(b)) {
    const next = clean((result[id] ?? 0) + value);
    if (next === 0) delete result[id];
    else result[id] = next;
  }
  return result;
}

export function subtractMoney(a: Money, b: Money): Money {
  const result: Money = { ...a };
  for (const [id, value] of Object.entries(b)) {
    const next = clean((result[id] ?? 0) - value);
    if (next === 0) delete result[id];
    else result[id] = next;
  }
  return result;
}

export function priceToBase(price: Price, currencies: Currency[]): number {
  const currency = getCurrency(currencies, price.currencyId);
  const rate = currency?.rate ?? 1;
  return clean(price.amount * rate);
}

export function canAfford(
  money: Money,
  cost: number,
  currencies: Currency[],
): boolean {
  return moneyToBase(money, currencies) + EPS >= cost;
}

/**
 * Tenta pagar `cost` (em unidades base) usando o dinheiro disponivel.
 * Usa as maiores denominacoes primeiro e, se necessario, "troca" uma moeda maior,
 * devolvendo o troco em denominacoes menores.
 * Retorna null quando nao ha dinheiro suficiente.
 */
export function pay(
  money: Money,
  cost: number,
  currencies: Currency[],
): { money: Money; paid: Money } | null {
  const target = clean(cost);
  if (target <= 0) return { money: { ...money }, paid: {} };
  if (!canAfford(money, cost, currencies)) return null;

  const ordered = sortedCurrencies(currencies);
  let remaining = target;
  const paid: Money = {};

  for (const currency of ordered) {
    if (remaining <= EPS) break;
    const have = money[currency.id] ?? 0;
    if (have <= 0 || currency.rate <= 0) continue;
    const take = Math.min(have, Math.floor(remaining / currency.rate + EPS));
    if (take > 0) {
      paid[currency.id] = clean(take);
      remaining = clean(remaining - take * currency.rate);
    }
  }

  // Ainda falta: quebra uma moeda maior e recebe troco
  if (remaining > EPS) {
    const candidates = ordered
      .filter((currency) => (money[currency.id] ?? 0) > 0 && currency.rate >= remaining)
      .sort((a, b) => a.rate - b.rate);
    const coin = candidates[0];
    if (coin) {
      paid[coin.id] = clean((paid[coin.id] ?? 0) + 1);
      remaining = clean(remaining - coin.rate);
    }
  }

  let wallet = subtractMoney(money, paid);
  const change = -remaining;
  if (change > EPS) wallet = addMoney(wallet, baseToMoney(change, currencies));
  return { money: normalizeMoney(wallet, currencies), paid };
}

/** Texto simples: "12 PO, 3 PP" */
export function moneyText(
  money: Money,
  currencies: Currency[],
  lang: string,
): string {
  const parts: string[] = [];
  for (const currency of sortedCurrencies(currencies)) {
    const value = money?.[currency.id] ?? 0;
    if (Math.abs(value) < EPS) continue;
    parts.push(
      `${formatNumber(value, lang, currency.decimals)} ${currency.symbol}`,
    );
  }
  if (parts.length === 0) {
    const main = mainCurrency(currencies);
    return main ? `0 ${main.symbol}` : "0";
  }
  return parts.join(", ");
}

/** HTML colorido por denominacao. */
export function moneyHtml(
  money: Money,
  currencies: Currency[],
  lang: string,
  opts: { compact?: boolean; max?: number } = {},
): string {
  if (opts.compact) {
    const total = moneyToBase(money, currencies);
    const main = mainCurrency(currencies);
    if (!main) return esc(moneyText(money, currencies, lang));
    const value = total / (main.rate || 1);
    const decimals = Math.abs(value % 1) > EPS ? 2 : 0;
    return `<span class="money"><b style="color:${esc(main.color)}">${esc(
      formatNumber(value, lang, decimals),
    )}</b> <span class="sym">${esc(main.symbol)}</span></span>`;
  }

  const parts: string[] = [];
  for (const currency of sortedCurrencies(currencies)) {
    const value = money?.[currency.id] ?? 0;
    if (Math.abs(value) < EPS) continue;
    parts.push(
      `<span class="money"><b style="color:${esc(currency.color)}">${esc(
        formatNumber(value, lang, currency.decimals),
      )}</b> <span class="sym">${esc(currency.symbol)}</span></span>`,
    );
  }
  if (parts.length === 0) {
    const main = mainCurrency(currencies);
    return main
      ? `<span class="money muted"><b>0</b> <span class="sym">${esc(main.symbol)}</span></span>`
      : `<span class="muted">0</span>`;
  }
  const max = opts.max ?? parts.length;
  const shown = parts.slice(0, max);
  const rest = parts.length - shown.length;
  return (
    shown.join(" ") + (rest > 0 ? ` <span class="muted">+${rest}</span>` : "")
  );
}

/** Preco digitado (ja guardado numa moeda especifica). */
export function priceText(
  price: Price,
  currencies: Currency[],
  lang: string,
): string {
  const currency = getCurrency(currencies, price.currencyId);
  const symbol = currency?.symbol ?? "";
  const decimals = currency?.decimals ?? 0;
  return `${formatNumber(price.amount, lang, decimals)} ${symbol}`.trim();
}

export function priceHtml(
  price: Price,
  currencies: Currency[],
  lang: string,
): string {
  const currency = getCurrency(currencies, price.currencyId);
  const color = currency?.color ?? "#e6e1d8";
  const decimals = currency?.decimals ?? 0;
  const symbol = currency?.symbol ?? "";
  return `<span class="money"><b style="color:${esc(color)}">${esc(
    formatNumber(price.amount, lang, decimals),
  )}</b>${symbol ? ` <span class="sym">${esc(symbol)}</span>` : ""}</span>`;
}

/** Valor em unidades base convertido de volta para a moeda principal. */
export function baseText(
  base: number,
  currencies: Currency[],
  lang: string,
): string {
  const main = mainCurrency(currencies);
  if (!main || main.rate <= 0) return formatNumber(base, lang, 0);
  const value = base / main.rate;
  const decimals = Math.abs(value % 1) > EPS ? 2 : 0;
  return `${formatNumber(value, lang, decimals)} ${main.symbol}`.trim();
}

export function baseHtml(
  base: number,
  currencies: Currency[],
  lang: string,
): string {
  return priceHtml(
    { amount: base, currencyId: sortedCurrencies(currencies)[0]?.id ?? "" },
    currencies,
    lang,
  );
}

/** Converte um valor base para a moeda escolhida (usado nos formularios de preco). */
export function baseToAmount(base: number, currency: Currency): number {
  if (currency.rate <= 0) return 0;
  return round(base / currency.rate, Math.max(currency.decimals, 2));
}

export function defaultCurrencies(lang: Lang): Currency[] {
  if (lang === "en") {
    return [
      {
        id: "gold",
        name: "Gold",
        plural: "Gold",
        symbol: "gp",
        color: "#f2c14e",
        rate: 100,
        decimals: 0,
      },
      {
        id: "silver",
        name: "Silver",
        plural: "Silver",
        symbol: "sp",
        color: "#c7ced8",
        rate: 10,
        decimals: 0,
      },
      {
        id: "copper",
        name: "Copper",
        plural: "Copper",
        symbol: "cp",
        color: "#c98a5e",
        rate: 1,
        decimals: 0,
      },
    ];
  }
  return [
    {
      id: "ouro",
      name: "Ouro",
      plural: "Ouros",
      symbol: "PO",
      color: "#f2c14e",
      rate: 100,
      decimals: 0,
    },
    {
      id: "prata",
      name: "Prata",
      plural: "Pratas",
      symbol: "PP",
      color: "#c7ced8",
      rate: 10,
      decimals: 0,
    },
    {
      id: "cobre",
      name: "Cobre",
      plural: "Cobres",
      symbol: "PC",
      color: "#c98a5e",
      rate: 1,
      decimals: 0,
    },
  ];
}
