import { esc } from "./util";

export type ButtonKind = "primary" | "ghost" | "danger" | "subtle" | "success";

const ICONS: Record<string, string> = {
  back: "M15 5 8 12l7 7",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L20 8l-4-4L4 16v4Z",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
  check: "M5 13l4 4L19 7",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v10m-3-8h6m-6 6h6",
  bag: "M6 8h12l-1 13H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  copy: "M9 9h9v9H9V9Zm-3 3H3V3h9v3",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0-6Z",
  sun: "M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
  moon: "M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z",
};

export function icon(name: keyof typeof ICONS | string): string {
  const path = ICONS[name] ?? ICONS.gear;
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
}

export function btn(options: {
  label: string;
  action: string;
  id?: string;
  kind?: ButtonKind;
  title?: string;
  disabled?: boolean;
  iconName?: string;
  confirm?: string;
  value?: string;
}): string {
  const kind = options.kind ?? "ghost";
  return `<button type="button" class="btn ${kind}" data-action="${esc(options.action)}"${
    options.id ? ` data-id="${esc(options.id)}"` : ""
  }${options.value ? ` data-value="${esc(options.value)}"` : ""}${
    options.title ? ` title="${esc(options.title)}"` : ""
  }${options.confirm ? ` data-confirm="${esc(options.confirm)}"` : ""}${
    options.disabled ? " disabled" : ""
  }>${options.iconName ? icon(options.iconName) : ""}<span>${esc(options.label)}</span></button>`;
}

export function iconBtn(options: {
  action: string;
  iconName: string;
  id?: string;
  title?: string;
  kind?: ButtonKind;
  confirm?: string;
  value?: string;
}): string {
  const kind = options.kind ?? "ghost";
  return `<button type="button" class="btn icon-only ${kind}" data-action="${esc(options.action)}"${
    options.id ? ` data-id="${esc(options.id)}"` : ""
  }${options.value ? ` data-value="${esc(options.value)}"` : ""}${
    options.title ? ` title="${esc(options.title)}"` : ""
  }${options.confirm ? ` data-confirm="${esc(options.confirm)}"` : ""}>${icon(
    options.iconName,
  )}</button>`;
}

export function thumb(url: string, label: string): string {
  const initial = esc((label || "?").trim().charAt(0).toUpperCase());
  if (url && /^(https?:)?\/\//i.test(url)) {
    return `<div class="thumb"><img src="${esc(url)}" alt="" loading="lazy" /></div>`;
  }
  return `<div class="thumb thumb-empty">${initial}</div>`;
}

export function input(options: {
  field: string;
  value?: string | number;
  id?: string;
  action?: string;
  type?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  className?: string;
  editField?: string;
}): string {
  const attrs = [
    `type="${esc(options.type ?? "text")}"`,
    `class="${esc(options.className ?? "input")}"`,
    `data-field="${esc(options.field)}"`,
    options.editField ? `data-edit-field="${esc(options.editField)}"` : "",
    options.action ? `data-action="${esc(options.action)}"` : "",
    options.id ? `data-id="${esc(options.id)}"` : "",
    options.placeholder ? `placeholder="${esc(options.placeholder)}"` : "",
    options.min !== undefined ? `min="${esc(String(options.min))}"` : "",
    options.max !== undefined ? `max="${esc(String(options.max))}"` : "",
    options.step !== undefined ? `step="${esc(String(options.step))}"` : "",
    `value="${esc(options.value ?? "")}"`,
  ];
  return `<input ${attrs.filter(Boolean).join(" ")} />`;
}

export function textarea(options: {
  field: string;
  value?: string;
  id?: string;
  action?: string;
  placeholder?: string;
  rows?: number;
  editField?: string;
}): string {
  return `<textarea class="input" rows="${options.rows ?? 3}" data-field="${esc(
    options.field,
  )}"${options.editField ? ` data-edit-field="${esc(options.editField)}"` : ""}${
    options.action ? ` data-action="${esc(options.action)}"` : ""
  }${options.id ? ` data-id="${esc(options.id)}"` : ""}${
    options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : ""
  }>${esc(options.value ?? "")}</textarea>`;
}

export function checkbox(options: {
  field: string;
  checked: boolean;
  label: string;
  id?: string;
  action?: string;
  editField?: string;
}): string {
  return `<label class="check"><input type="checkbox" data-field="${esc(options.field)}"${
    options.editField ? ` data-edit-field="${esc(options.editField)}"` : ""
  }${options.action ? ` data-action="${esc(options.action)}"` : ""}${
    options.id ? ` data-id="${esc(options.id)}"` : ""
  }${options.checked ? " checked" : ""} /><span>${esc(options.label)}</span></label>`;
}

export function select(options: {
  field: string;
  value: string;
  options: { value: string; label: string }[];
  id?: string;
  action?: string;
  editField?: string;
  className?: string;
}): string {
  const body = options.options
    .map(
      (option) =>
        `<option value="${esc(option.value)}"${
          option.value === options.value ? " selected" : ""
        }>${esc(option.label)}</option>`,
    )
    .join("");
  return `<select class="${esc(options.className ?? "input")}" data-field="${esc(options.field)}"${
    options.editField ? ` data-edit-field="${esc(options.editField)}"` : ""
  }${options.action ? ` data-action="${esc(options.action)}"` : ""}${
    options.id ? ` data-id="${esc(options.id)}"` : ""
  }>${body}</select>`;
}

export function field(
  label: string,
  control: string,
  hint?: string,
): string {
  return `<label class="field"><span class="field-label">${esc(label)}</span>${control}${
    hint ? `<span class="field-hint">${esc(hint)}</span>` : ""
  }</label>`;
}

export function section(
  title: string,
  body: string,
  options: { actions?: string; hint?: string; id?: string } = {},
): string {
  return `<section class="section"${options.id ? ` id="${esc(options.id)}"` : ""}>
    <header class="section-head">
      <h2>${esc(title)}</h2>
      ${options.actions ? `<div class="section-actions">${options.actions}</div>` : ""}
    </header>
    ${options.hint ? `<p class="section-hint">${esc(options.hint)}</p>` : ""}
    ${body}
  </section>`;
}

export function empty(text: string): string {
  return `<div class="empty">${esc(text)}</div>`;
}

export function badge(text: string, kind = ""): string {
  return `<span class="badge ${kind}">${esc(text)}</span>`;
}

export function pill(text: string, color?: string): string {
  return `<span class="pill"${
    color ? ` style="border-color:${esc(color)}55;color:${esc(color)}"` : ""
  }>${esc(text)}</span>`;
}

export function tabs(
  items: { id: string; label: string; active: boolean; badge?: string }[],
  action = "tab",
): string {
  return `<nav class="tabs">${items
    .map(
      (item) =>
        `<button type="button" class="tab${item.active ? " active" : ""}" data-action="${esc(
          action,
        )}" data-value="${esc(item.id)}">${esc(item.label)}${
          item.badge ? `<span class="tab-badge">${esc(item.badge)}</span>` : ""
        }</button>`,
    )
    .join("")}</nav>`;
}

export function moneyRow(
  label: string,
  value: string,
  color?: string,
): string {
  return `<div class="money-row"><span class="money-row-label">${esc(label)}</span><span class="money-row-value"${
    color ? ` style="color:${esc(color)}"` : ""
  }>${value}</span></div>`;
}
