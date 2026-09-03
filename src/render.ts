import { t } from "./i18n";
import { state } from "./state";
import {
  badge,
  btn,
  empty,
  icon,
  section,
  select,
  tabs,
  thumb,
} from "./ui";
import { esc } from "./util";
import { renderOrders } from "./views/orders";
import {
  canManage,
  renderBuyTab,
  renderManageTab,
  renderSellTab,
  renderServicesTab,
  renderShopTabs,
} from "./views/shop";
import { renderSettings } from "./views/settings";
import { renderShops } from "./views/shops";
import { renderWallet } from "./views/wallet";

function appClass(extra = ""): string {
  const theme = localStorage.getItem("merchant-theme") === "light" ? "light" : "dark";
  return `app ${theme}${extra ? ` ${extra}` : ""}`;
}

function themeToggle(): string {
  const dark = localStorage.getItem("merchant-theme") !== "light";
  return `<button type="button" class="btn icon-only ghost theme-toggle" data-action="toggle-theme" title="${dark ? "Light mode" : "Dark mode"}" aria-label="${dark ? "Light mode" : "Dark mode"}">${icon(dark ? "sun" : "moon")}</button>`;
}

function langSelect(): string {
  return select({
    field: "lang",
    value: state.lang,
    options: [
      { value: "pt-BR", label: "PT" },
      { value: "en", label: "EN" },
    ],
    className: "input tiny",
  });
}

function toastHtml(): string {
  if (!state.toast) return "";
  return `<div class="toast ${state.toast.kind}" data-action="dismiss-toast">${esc(
    state.toast.text,
  )}</div>`;
}

function homeContent(): string {
  switch (state.route.name === "home" ? state.route.tab : "shops") {
    case "wallet":
      return renderWallet();
    case "orders":
      return renderOrders();
    case "settings":
      return renderSettings();
    default:
      return renderShops();
  }
}

function homeTabs(): string {
  const lang = state.lang;
  const isGm = state.role === "GM";
  const pending = state.orders.filter((order) => !order.done).length;
  const items = [
    { id: "shops", label: t(lang, "tab.shops"), active: false },
    { id: "wallet", label: t(lang, "tab.wallet"), active: false },
    {
      id: "orders",
      label: t(lang, "tab.orders"),
      active: false,
      badge: pending > 0 && isGm ? String(pending) : undefined,
    },
  ];
  if (isGm) items.push({ id: "settings", label: t(lang, "tab.settings"), active: false });
  const current = state.route.name === "home" ? state.route.tab : "shops";
  return tabs(
    items.map((item) => ({ ...item, active: item.id === current })),
    "tab",
  );
}

function renderHomeScreen(): string {
  const lang = state.lang;
  return `<div class="${appClass()}">
    <header class="app-header">
      <div class="brand">
        <span class="brand-icon">${icon("bag")}</span>
        <div class="brand-text">
          <h1>${esc(t(lang, "app.title"))}</h1>
          <span class="tagline">${esc(t(lang, "app.tagline"))}</span>
        </div>
      </div>
      <div class="header-actions">
        ${themeToggle()}
        ${langSelect()}
        ${badge(
          state.role === "GM" ? t(lang, "common.gm") : t(lang, "common.player"),
          state.role === "GM" ? "gm" : "",
        )}
      </div>
    </header>
    <main class="app-body">${homeContent()}</main>
    <nav class="tabbar">${homeTabs()}</nav>
    ${toastHtml()}
  </div>`;
}

function renderShopScreen(): string {
  const lang = state.lang;
  const route = state.route;
  if (route.name !== "shop") return renderHomeScreen();
  const token = state.tokens.find((entry) => entry.id === route.itemId);
  const back = btn({
    label: t(lang, "common.back"),
    action: "back",
    iconName: "back",
    kind: "ghost",
  });

  if (!token) {
    return `<div class="${appClass("shop-app")}">
      <header class="app-header"><div class="brand"><span class="brand-icon">${icon("bag")}</span><div class="brand-text"><h1>${esc(t(lang, "app.title"))}</h1></div></div></header>
      <main class="app-body">${empty(t(lang, "shops.empty"))}</main>
      <nav class="tabbar">${back}</nav>
      ${toastHtml()}
    </div>`;
  }

  if (!token.shop) {
    const canCreate = state.role === "GM";
    return `<div class="${appClass("shop-app")}">
      <header class="app-header">
        <div class="brand">
          ${thumb(token.image, token.name)}
          <div class="brand-text"><h1>${esc(token.name)}</h1></div>
        </div>
        <div class="header-actions">${themeToggle()}${langSelect()}</div>
      </header>
      <main class="app-body">
        ${section(
          t(lang, "shop.notMerchant"),
          canCreate
            ? `<div class="row wrap">${btn({
                label: t(lang, "shops.makeShop"),
                action: "create-shop",
                id: token.id,
                kind: "primary",
              })}</div>`
            : empty(t(lang, "shop.notMerchantPlayer")),
          { hint: canCreate ? t(lang, "shop.notMerchantGm") : "" },
        )}
      </main>
      <nav class="tabbar">${back}</nav>
      ${toastHtml()}
    </div>`;
  }

  const manage = canManage(token);
  let tab = route.tab;
  if (tab === "manage" && !manage) tab = "buy";

  // Loja desativada: jogadores nao veem nada, o Mestre/responsavel gerencia
  if (!token.shop.enabled && !manage) {
    return `<div class="${appClass("shop-app")}">
      <header class="app-header">
        <div class="brand">
          ${thumb(token.image, token.name)}
          <div class="brand-text"><h1>${esc(token.name)}</h1></div>
        </div>
        <div class="header-actions">${themeToggle()}${langSelect()}</div>
      </header>
      <main class="app-body">${empty(t(lang, "shop.notMerchantPlayer"))}</main>
      <nav class="tabbar">${btn({ label: t(lang, "common.back"), action: "back", iconName: "back" })}</nav>
      ${toastHtml()}
    </div>`;
  }

  const body =
    tab === "sell"
      ? renderSellTab(token)
      : tab === "services"
        ? renderServicesTab(token)
        : tab === "manage"
          ? renderManageTab(token)
          : renderBuyTab(token);

  const greeting =
    token.shop.greeting && tab === "buy"
      ? `<p class="greeting">“${esc(token.shop.greeting)}”</p>`
      : "";

  return `<div class="${appClass("shop-app")}">
    <header class="app-header">
      <div class="brand">
        ${thumb(token.image, token.shop.name || token.name)}
        <div class="brand-text">
          <h1>${esc(token.shop.name || token.name)}</h1>
          ${token.shop.enabled ? "" : badge(t(lang, "common.disabled2"))}
        </div>
      </div>
      <div class="header-actions">${themeToggle()}${langSelect()}</div>
    </header>
    ${renderShopTabs(token, tab)}
    <main class="app-body">${greeting}${body}</main>
    <nav class="tabbar">${back}</nav>
    ${toastHtml()}
  </div>`;
}

export function renderApp(): string {
  if (!state.ready) {
    return `<div class="${appClass()}"><div class="loading">${esc(t(state.lang, "app.loading"))}</div></div>`;
  }
  return state.route.name === "shop" ? renderShopScreen() : renderHomeScreen();
}
