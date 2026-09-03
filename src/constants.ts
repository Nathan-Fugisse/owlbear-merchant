/**
 * Identificador unico da extensao.
 *
 * ATENCAO: esse valor faz parte das chaves de metadata (ex.:
 * `com.github.nathan-fugisse.owlbear-merchant/shop`). Mudar depois do primeiro uso
 * faz os dados salvos (lojas, carteiras) "desaparecerem", entao so altere se
 * voce ainda nao publicou a extensao.
 */
export const EXTENSION_ID = "com.github.nathan-fugisse.owlbear-merchant";

/** Chaves usadas dentro dos metadados (sempre prefixadas para evitar colisao). */
export const METADATA = {
  shop: `${EXTENSION_ID}/shop`,
  settings: `${EXTENSION_ID}/settings`,
  wallets: `${EXTENSION_ID}/wallets`,
  orders: `${EXTENSION_ID}/orders`,
} as const;

export const CONTEXT_MENU_ID = `${EXTENSION_ID}/context-menu`;
export const POPOVER_ID = `${EXTENSION_ID}/popover`;

/** Versao do formato dos dados (permite migracoes futuras). */
export const DATA_VERSION = 1;

/** Teto de seguranca: metadata de sala nao deve passar de 16 kB. */
export const ROOM_METADATA_LIMIT = 16 * 1024;
export const METADATA_WARN_LIMIT = 12 * 1024;

/** Quantidade maxima de linhas no historico de transacoes. */
export const MAX_LOG_ENTRIES = 20;

/** Camadas onde faz sentido ter um mercador. */
export const TOKEN_LAYERS = ["CHARACTER", "MOUNT", "PROP", "ATTACHMENT"] as const;
