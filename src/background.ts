import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { CONTEXT_MENU_ID, POPOVER_ID } from "./constants";

const BASE = import.meta.env.BASE_URL;
const DATA_PREFIX = "owlbear-merchant:data:";

function storedLang(): "pt-BR" | "en" {
  try {
    const value = localStorage.getItem("owlbear-merchant:lang");
    if (value === "pt-BR" || value === "en") return value;
  } catch {
    /* localStorage pode estar bloqueado */
  }
  return "en";
}

function labels(): { open: string; manage: string; create: string } {
  return storedLang() === "pt-BR"
    ? { open: "Abrir loja", manage: "Gerenciar loja", create: "Tornar loja" }
    : { open: "Open shop", manage: "Manage shop", create: "Make shop" };
}

function hasLocalShop(roomId: string, itemId: string): boolean {
  try {
    const raw = localStorage.getItem(`${DATA_PREFIX}${roomId}`);
    if (!raw) return false;
    const data = JSON.parse(raw) as { shops?: Record<string, unknown> };
    return Boolean(data.shops?.[itemId]);
  } catch {
    return false;
  }
}

OBR.onReady(() => {
  const label = labels();

  OBR.contextMenu.create({
    id: CONTEXT_MENU_ID,
    icons: [
      {
        icon: `${BASE}icon-shop.svg`,
        label: storedLang() === "pt-BR" ? "Merchant" : "Merchant",
        filter: { min: 1, max: 1, some: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    onClick: (context, elementId) => {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const roomId = OBR.room.id;
      const isMerchant = hasLocalShop(roomId, item.id);
      const role = OBR.player.getRole();

      const open = (tab: string) => {
        void OBR.popover.open({
          id: POPOVER_ID,
          url: `${BASE}index.html?shop=${encodeURIComponent(item.id)}&tab=${tab}`,
          width: 520,
          height: 720,
          anchorElementId: elementId,
        });
      };

      void (async () => {
        const isGm = (await role) === "GM";
        if (isMerchant) {
          open(isGm ? "manage" : "buy");
          return;
        }
        if (isGm) open("manage");
      })();
    },
  });
});
