/** Identificador unico da extensao. */
export const EXTENSION_ID = "com.github.nathan-fugisse.owlbear-merchant";

export const CONTEXT_MENU_ID = `${EXTENSION_ID}/context-menu`;
export const POPOVER_ID = `${EXTENSION_ID}/popover`;

/** Versao do formato dos dados (permite migracoes futuras). */
export const DATA_VERSION = 1;

/** Quantidade maxima de linhas no historico de transacoes. */
export const MAX_LOG_ENTRIES = 20;

/** Camadas onde faz sentido ter um mercador. */
export const TOKEN_LAYERS = ["CHARACTER", "MOUNT", "PROP", "ATTACHMENT"] as const;
