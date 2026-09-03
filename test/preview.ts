/**
 * Gera um preview estatico (preview/index.html) com todas as telas renderizadas
 * para conferencia visual sem precisar instalar a extensao.
 * Rode com `npm run preview:build`.
 */
import fs from "node:fs";
import path from "node:path";

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
const { setEditor } = await import("../src/editor");
const { defaultCurrencies } = await import("../src/currency");
const { defaultSettings, newStockEntry, newServiceEntry } = await import(
  "../src/defaults"
);

const currencies = defaultCurrencies("pt-BR");
const settings = defaultSettings("pt-BR");

const potion = {
  id: "item-1",
  name: "Poção de cura",
  description: "Restaura 2d4+2 pontos de vida.",
  icon: "",
  price: { amount: 50, currencyId: "ouro" },
  rarity: "common" as const,
  weight: 0.5,
};

const shop = {
  version: 1,
  enabled: true,
  name: "Ferreiro Boris",
  greeting: "Bem-vindo à minha loja, viajante!",
  priceMultiplier: 1,
  payoutMultiplier: 0.5,
  infiniteFunds: true,
  funds: { ouro: 500, prata: 40, cobre: 75 },
  allowPlayerManage: false,
  rarityMultipliers: { rare: 2 },
  stock: [
    { ...potion, id: "stock-1", quantity: 3 },
    {
      id: "stock-2",
      name: "Espada longa",
      description: "1d8 de dano cortante.",
      icon: "",
      price: { amount: 15, currencyId: "ouro" },
      rarity: "rare" as const,
      weight: 3,
      quantity: 1,
    },
    {
      id: "stock-3",
      name: "Adaga",
      description: "",
      icon: "",
      price: { amount: 2, currencyId: "ouro" },
      rarity: "" as const,
      weight: 0.5,
      quantity: -1,
    },
  ],
  services: [
    {
      ...newServiceEntry(currencies),
      id: "svc-1",
      name: "Conserto de armadura",
      description: "Deixa sua armadura como nova.",
      price: { amount: 10, currencyId: "ouro" },
    },
  ],
  updatedAt: Date.now(),
};

const wallet = {
  id: "player-1",
  name: "Thorin",
  color: "#8b7bff",
  money: { ouro: 12, prata: 3, cobre: 7 },
  inventory: [
    { ...potion, id: "inv-1", quantity: 2, name: "Poção de cura" },
    {
      id: "inv-2",
      name: "Anel antigo",
      description: "Um anel de origem desconhecida.",
      icon: "",
      price: { amount: 120, currencyId: "ouro" },
      rarity: "legendary" as const,
      weight: 0,
      quantity: 1,
    },
  ],
  updatedAt: Date.now(),
};

state.ready = true;
state.sceneReady = true;
state.role = "GM";
state.playerId = "player-1";
state.playerName = "Thorin";
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
    playerName: "Thorin",
    price: { amount: 10, currencyId: "ouro" },
    createdAt: Date.now(),
    done: false,
  },
];
state.tokens = [
  { id: "token-1", name: "Ferreiro Boris", image: "", layer: "CHARACTER", owner: "player-1", shop },
  { id: "token-2", name: "Mercadora Elfa", image: "", layer: "CHARACTER", owner: "player-1" },
  { id: "token-3", name: "Goblin", image: "", layer: "CHARACTER", owner: "player-1" },
];
state.walletViewId = "player-1";
state.settings.log = [
  { id: "log-1", at: Date.now(), type: "buy", player: "Thorin", merchant: "Ferreiro Boris", amount: -50, detail: "1× Poção de cura" },
  { id: "log-2", at: Date.now(), type: "sell", player: "Thorin", merchant: "Ferreiro Boris", amount: 60, detail: "1× Anel antigo" },
];

const screens: { id: string; label: string; html: string }[] = [];

function capture(id: string, label: string): void {
  screens.push({ id, label, html: renderApp() });
}

state.route = { name: "home", tab: "shops" };
capture("home-shops", "Lojas");
state.route = { name: "home", tab: "wallet" };
capture("home-wallet", "Carteira");
state.route = { name: "home", tab: "orders" };
capture("home-orders", "Pedidos");
state.route = { name: "home", tab: "settings" };
capture("home-settings", "Configurações");
state.route = { name: "shop", itemId: "token-1", tab: "buy" };
capture("shop-buy", "Loja · Comprar");
state.route = { name: "shop", itemId: "token-1", tab: "sell" };
capture("shop-sell", "Loja · Vender");
state.route = { name: "shop", itemId: "token-1", tab: "services" };
capture("shop-services", "Loja · Serviços");
state.route = { name: "shop", itemId: "token-1", tab: "manage" };
capture("shop-manage", "Loja · Gerenciar");
setEditor({ kind: "stock", entryId: "stock-1" }, { ...potion, id: "stock-1", quantity: 3 });
capture("shop-editor", "Loja · Editor de item");
setEditor(null, null);
state.route = { name: "shop", itemId: "token-2", tab: "buy" };
capture("shop-new", "Token sem loja");

const css = fs.readFileSync(path.resolve("src/style.css"), "utf8");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>owlbear-merchant · preview</title>
<style>
${css}
body { background: #100f18; padding: 16px; display: flex; gap: 16px; align-items: flex-start; font-family: ui-sans-serif, system-ui, sans-serif; }
.side { width: 180px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; position: sticky; top: 16px; }
.side h2 { font-size: 12px; color: #9c99b6; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 4px; }
.side button { text-align: left; padding: 8px 10px; border-radius: 8px; border: 1px solid #37354c; background: #211f2e; color: #ece9f5; font: inherit; font-size: 12px; cursor: pointer; }
.side button.active { background: #8b7bff; border-color: #8b7bff; color: #14121f; font-weight: 600; }
.stage { width: 520px; height: 720px; flex: 0 0 auto; }
.stage .screen { display: none; height: 100%; }
.stage .screen.active { display: block; }
.hint { color: #9c99b6; font-size: 11px; margin-top: 8px; }
</style>
</head>
<body>
  <nav class="side">
    <h2>Telas</h2>
    ${screens
      .map(
        (screen, index) =>
          `<button data-index="${index}" class="${index === 0 ? "active" : ""}">${screen.label}</button>`,
      )
      .join("")}
    <p class="hint">Preview estático gerado por <code>npm run preview:build</code>.</p>
  </nav>
  <div class="stage">
    ${screens
      .map(
        (screen, index) =>
          `<div class="screen${index === 0 ? " active" : ""}" data-screen="${index}">${screen.html}</div>`,
      )
      .join("")}
  </div>
<script>
  const buttons = document.querySelectorAll('.side button');
  const screens = document.querySelectorAll('.stage .screen');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      screens.forEach((s) => s.classList.remove('active'));
      button.classList.add('active');
      const screen = document.querySelector('.stage .screen[data-screen="' + button.dataset.index + '"]');
      if (screen) screen.classList.add('active');
    });
  });
</script>
</body>
</html>
`;

fs.mkdirSync(path.resolve("preview"), { recursive: true });
fs.writeFileSync(path.resolve("preview/index.html"), html);
console.log(`preview/index.html gerado com ${screens.length} telas.`);
