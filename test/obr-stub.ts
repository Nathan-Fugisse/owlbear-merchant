/**
 * Stub minimalista do SDK do Owlbear Rodeo usado apenas no smoke test.
 * Nunca entra no bundle da extensao.
 */
const noop = async (..._args: unknown[]) => undefined;
const unsub = () => () => undefined;

export const isImage = (item: { type?: string } | null): boolean =>
  item?.type === "IMAGE";

export const isShape = (item: { type?: string } | null): boolean =>
  item?.type === "SHAPE";

const OBR = {
  onReady: (callback: () => void) => {
    (globalThis as Record<string, unknown>).__obrReady = callback;
  },
  player: {
    getRole: async () => "GM",
    getId: async () => "player-1",
    getName: async () => "Mestre",
    getColor: async () => "#8b7bff",
    getSelection: async () => [],
    onChange: unsub,
  },
  room: {
    getPermissions: async () => [],
  },
  scene: {
    isReady: async () => true,
    onReadyChange: unsub,
    grid: {
      getDpi: async () => 128,
      getScale: async () => ({ x: 1, y: 1 }),
    },
    items: {
      getItems: async () =>
        ((globalThis as Record<string, unknown>).__items as unknown[]) ?? [],
      updateItems: noop,
      addItems: noop,
      deleteItems: noop,
      getItemAttachments: async () => [],
      getItemBounds: async () => ({ min: { x: 0, y: 0 }, max: { x: 1, y: 1 } }),
      onChange: unsub,
    },
  },
  party: { getPlayers: async () => [], onChange: unsub },
  popover: { open: noop, close: noop },
  contextMenu: { create: noop, remove: noop },
};

export default OBR;
