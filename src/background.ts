import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { CONTEXT_MENU_ID, METADATA, POPOVER_ID } from "./constants";

const BASE = import.meta.env.BASE_URL;

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

const SHOP_ENABLED_KEY = ["metadata", METADATA.shop, "enabled"];
const IS_IMAGE: { key: string; value: string } = { key: "type", value: "IMAGE" };

OBR.onReady(() => {
  const label = labels();

  OBR.contextMenu.create({
    id: CONTEXT_MENU_ID,
    icons: [
      // 1) Mestre + token que ja e mercador -> gerenciar
      {
        icon: `${BASE}icon-manage.svg`,
        label: label.manage,
        filter: {
          min: 1,
          max: 1,
          roles: ["GM"],
          some: [
            IS_IMAGE,
            { key: SHOP_ENABLED_KEY, value: true },
          ],
        },
      },
      // 2) Mestre + token que ainda nao e mercador -> tornar loja
      {
        icon: `${BASE}icon-new.svg`,
        label: label.create,
        filter: {
          min: 1,
          max: 1,
          roles: ["GM"],
          some: [
            IS_IMAGE,
            { key: SHOP_ENABLED_KEY, value: true, operator: "!=" },
          ],
        },
      },
      // 3) Qualquer jogador + token que ja e mercador -> abrir loja
      {
        icon: `${BASE}icon-shop.svg`,
        label: label.open,
        filter: {
          min: 1,
          max: 1,
          some: [
            IS_IMAGE,
            { key: SHOP_ENABLED_KEY, value: true },
          ],
        },
      },
    ],
    onClick: (context, elementId) => {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const isMerchant = item.metadata[METADATA.shop] !== undefined;
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

      // Mestre num token que ainda nao e mercador: cria a loja e abre a gerencia
      if (!isMerchant) {
        void (async () => {
          if ((await role) !== "GM") return;
          try {
            await OBR.scene.items.updateItems(
              (candidate) => candidate.id === item.id,
              (items) => {
                for (const draft of items) {
                  (draft.metadata as Record<string, unknown>)[METADATA.shop] = {
                    version: 1,
                    enabled: true,
                    name: item.name ?? "",
                    updatedAt: Date.now(),
                  };
                }
              },
            );
            open("manage");
          } catch (error) {
            console.error("[owlbear-merchant] nao foi possivel criar a loja:", error);
          }
        })();
        return;
      }

      void (async () => {
        const isGm = (await role) === "GM";
        open(isGm ? "manage" : "buy");
      })();
    },
  });
});
