/**
 * Smoke test: renderiza todas as telas/abas fora do navegador para garantir
 * que nenhuma view quebra. Rode com `npm run smoke`.
 */
const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
};
(globalThis as Record<string, unknown>).navigator = { language: "pt-BR" };
(globalThis as Record<string, unknown>).window = {
  location: { search: "" },
  history: { replaceState: () => undefined },
  setTimeout: () => 0,
  clearTimeout: () => undefined,
};

const { state } = await import("../src/state");
const { renderApp } = await import("../src/render");
const { getPresets } = await import("../src/views/settings");
const { setEditor } = await import("../src/editor");
const { defaultCurrencies } = await import("../src/currency");
const { defaultSettings, newStockEntry, newServiceEntry } = await import(
  "../src/defaults"
);

const currencies = defaultCurrencies("pt-BR");
const settings = defaultSettings("pt-BR");

const item = {
  id: "item-1",
  name: "Poção de cura",
  icon: "https://example.com/potion.png",
  price: { amount: 50, currencyId: "ouro" },
  rarity: "common" as const,
  weight: 0.5,
};

const shop = {
  version: 1,
  enabled: true,
  name: "Ferreiro Boris",
  greeting: "Bem-vindo à minha loja!",
  priceMultiplier: 1,
  payoutMultiplier: 0.5,
  interactionRange: 0,
  infiniteFunds: true,
  funds: { ouro: 500, prata: 0, cobre: 0 },
  allowPlayerManage: false,
  rarityMultipliers: { rare: 2 },
  stock: [{ ...item, id: "stock-1", quantity: 3 }],
  services: [{ ...newServiceEntry(currencies), id: "svc-1", name: "Conserto de armadura", price: { amount: 10, currencyId: "ouro" } }],
  updatedAt: Date.now(),
};

const wallet = {
  id: "player-1",
  name: "Mestre",
  color: "#8b7bff",
  money: { ouro: 12, prata: 3, cobre: 7 },
  inventory: [{ ...item, id: "inv-1", quantity: 2 }],
  updatedAt: Date.now(),
};

state.ready = true;
state.sceneReady = true;
state.role = "GM";
state.playerId = "player-1";
state.playerName = "Mestre";
state.color = "#8b7bff";
state.settings = settings;
state.wallets = { [wallet.id]: wallet };
state.orders = [
  {
    id: "ord-1",
    merchantId: "token-1",
    merchantName: "Ferreiro Boris",
    serviceId: "svc-1",
    serviceName: "Conserto de armadura",
    playerId: "player-1",
    playerName: "Mestre",
    price: { amount: 10, currencyId: "ouro" },
    createdAt: Date.now(),
    done: false,
  },
];
state.tokens = [
  { id: "token-1", name: "Ferreiro Boris", image: "https://example.com/b.png", layer: "CHARACTER", owner: "player-1", shop },
  { id: "token-2", name: "Goblin", image: "", layer: "CHARACTER", owner: "player-1" },
];
state.walletViewId = "player-1";
state.settings.log = [
  { id: "log-1", at: Date.now(), type: "buy", player: "Mestre", merchant: "Boris", amount: -50, detail: "1× Poção" },
];

const problems: string[] = [];

function check(name: string): void {
  try {
    const html = renderApp();
    if (!html || html.length < 60) problems.push(`${name}: saida suspeita (${html.length} chars)`);
    if (html.includes("undefined")) problems.push(`${name}: contém "undefined"`);
    if (html.includes("[object Object]")) problems.push(`${name}: contém "[object Object]"`);
    if (html.includes("NaN")) problems.push(`${name}: contém "NaN"`);
    console.log(`  ok  ${name} (${html.length} chars)`);
  } catch (error) {
    problems.push(`${name}: ${(error as Error).message}`);
    console.log(`  ERRO ${name}: ${(error as Error).stack}`);
  }
}

console.log("Home:");
for (const tab of ["shops", "wallet", "orders", "settings"] as const) {
  state.route = { name: "home", tab };
  check(`home/${tab}`);
}

console.log("Loja (GM):");
for (const tab of ["buy", "sell", "services", "manage"] as const) {
  state.route = { name: "shop", itemId: "token-1", tab };
  check(`shop/${tab}`);
}

console.log("Loja (jogador):");
state.role = "PLAYER";
for (const tab of ["buy", "sell", "services", "manage"] as const) {
  state.route = { name: "shop", itemId: "token-1", tab };
  check(`shop-player/${tab}`);
}
state.role = "GM";

console.log("Casos extremos:");
state.route = { name: "shop", itemId: "token-2", tab: "buy" };
check("shop/token sem loja");
state.route = { name: "shop", itemId: "nao-existe", tab: "buy" };
check("shop/token inexistente");
state.route = { name: "home", tab: "settings" };
setEditor({ kind: "stock", entryId: null }, newStockEntry(currencies));
state.route = { name: "shop", itemId: "token-1", tab: "manage" };
check("shop/editor de item");
setEditor({ kind: "service", entryId: "svc-1" }, newServiceEntry(currencies));
check("shop/editor de serviço");
setEditor(null, null);

console.log("Matemática de moedas:");
const { pay, baseToMoney, moneyToBase } = await import("../src/currency");
const coins = currencies; // Ouro 100 / Prata 10 / Cobre 1

function expect(name: string, condition: boolean, extra = ""): void {
  if (condition) {
    console.log(`  ok  ${name}`);
  } else {
    problems.push(`moeda: ${name} ${extra}`);
    console.log(`  ERRO ${name} ${extra}`);
  }
}

const idOuro = coins[0].id;
const idPrata = coins[1].id;
const idCobre = coins[2].id;

expect("valor total em unidades base", moneyToBase({ [idOuro]: 1, [idPrata]: 2, [idCobre]: 3 }, coins) === 123);
expect("converte base em denominações", JSON.stringify(baseToMoney(123, coins)) === JSON.stringify({ [idOuro]: 1, [idPrata]: 2, [idCobre]: 3 }));
expect("pagamento exato", JSON.stringify(pay({ [idOuro]: 2 }, 200, coins)) === JSON.stringify({ money: {}, paid: { [idOuro]: 2 } }));

const change = pay({ [idOuro]: 1 }, 50, coins);
expect("troco de 1 ouro em 50", !!change && moneyToBase(change.money, coins) === 50, JSON.stringify(change));
expect("troco vem em prata", !!change && change.money[idPrata] === 5);

const change2 = pay({ [idPrata]: 5 }, 45, coins);
expect("troco de 5 pratas em 45", !!change2 && change2.money[idCobre] === 5, JSON.stringify(change2));

expect("sem dinheiro suficiente", pay({ [idCobre]: 9 }, 10, coins) === null);
expect("preço zero não cobra", !!pay({ [idOuro]: 1 }, 0, coins));
expect("carteira vazia não paga", pay({}, 1, coins) === null);

const mixed = pay({ [idOuro]: 1, [idCobre]: 5 }, 105, coins);
expect("pagamento misto", !!mixed && moneyToBase(mixed.money, coins) === 0, JSON.stringify(mixed));

console.log("Moedas:");
const presets = getPresets("pt-BR");
for (const key of Object.keys(presets)) {
  if (!Array.isArray(presets[key])) problems.push(`preset ${key} inválido`);
}
console.log(`  ok  presets: ${Object.keys(presets).join(", ")}`);

if (problems.length) {
  console.error(`\n${problems.length} problema(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log("\nTodas as telas renderizaram sem erro.");
