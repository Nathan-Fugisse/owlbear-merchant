export type Lang = "pt-BR" | "en";

export type Role = "GM" | "PLAYER";

/** Valor guardado por denominacao: { [currencyId]: quantidade }. */
export type Money = Record<string, number>;

/** Um preco e sempre guardado na moeda em que foi digitado. */
export type Price = {
  amount: number;
  currencyId: string;
};

export type Currency = {
  id: string;
  /** Nome no singular: "Ouro" */
  name: string;
  /** Nome no plural: "Ouros" */
  plural: string;
  /** Simbolo/sufixo curto: "PO" */
  symbol: string;
  /** Cor usada na interface */
  color: string;
  /** Quantas unidades base vale 1 unidade desta moeda (ex.: Ouro = 100, Cobre = 1) */
  rate: number;
  /** Casas decimais permitidas (0 = inteiro) */
  decimals: number;
};

export type RarityKey =
  | "common"
  | "uncommon"
  | "rare"
  | "veryRare"
  | "legendary"
  | "artifact";

export type ItemBase = {
  id: string;
  name: string;
  description: string;
  /** URL da imagem (precisa ter CORS liberado) */
  icon: string;
  price: Price;
  rarity: RarityKey | "";
  weight: number;
};

/** Item a venda na loja. `quantity` = -1 significa estoque infinito. */
export type StockEntry = ItemBase & { quantity: number };

/** Item no inventario de um jogador. */
export type InventoryEntry = ItemBase & { quantity: number };

/** Servico contratavel (estalagem, cura, transporte...). */
export type ServiceEntry = {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: Price;
  /** Se true, a contratacao gera um pedido para o GM resolver. */
  active: boolean;
};

export type ShopData = {
  version: number;
  enabled: boolean;
  /** Nome do mercador (vazio = usa o nome do token) */
  name: string;
  /** Mensagem de saudacao exibida aos jogadores */
  greeting: string;
  /** Multiplicador do preco cobrado do jogador (1 = preco de tabela) */
  priceMultiplier: number;
  /** Multiplicador do valor pago ao jogador (0.5 = metade do preco) */
  payoutMultiplier: number;
  /** Distancia maxima em celulas de grid; 0 = desativado */
  interactionRange: number;
  /** Ignora os fundos do mercador (dinheiro infinito) */
  infiniteFunds: boolean;
  funds: Money;
  /** Permite que donos do token gerenciem a loja */
  allowPlayerManage: boolean;
  rarityMultipliers: Partial<Record<RarityKey, number>>;
  stock: StockEntry[];
  services: ServiceEntry[];
  updatedAt: number;
};

export type Wallet = {
  id: string;
  name: string;
  color: string;
  money: Money;
  inventory: InventoryEntry[];
  updatedAt: number;
};

export type Order = {
  id: string;
  merchantId: string;
  merchantName: string;
  serviceId: string;
  serviceName: string;
  playerId: string;
  playerName: string;
  price: Price;
  createdAt: number;
  done: boolean;
};

export type LogType = "buy" | "sell" | "service" | "transfer" | "adjust";

export type LogEntry = {
  id: string;
  at: number;
  type: LogType;
  player: string;
  merchant: string;
  /** Valor em unidades base (positivo = entrou, negativo = saiu) */
  amount: number;
  detail: string;
};

export type Settings = {
  version: number;
  currencies: Currency[];
  defaultPriceMultiplier: number;
  defaultPayoutMultiplier: number;
  defaultInteractionRange: number;
  /** Multiplicadores padrao por raridade */
  rarityMultipliers: Record<RarityKey, number>;
  /** Mostrar aviso de peso no inventario */
  showRarity: boolean;
  log: LogEntry[];
};

export type Route =
  | { name: "home"; tab: HomeTab }
  | { name: "shop"; itemId: string; tab: ShopTab };

export type HomeTab = "shops" | "wallet" | "orders" | "settings";
export type ShopTab = "buy" | "sell" | "services" | "manage";

export type ToastKind = "info" | "success" | "error";

export type Toast = {
  id: number;
  text: string;
  kind: ToastKind;
};

/** Formulario aberto no momento (editor de item/servico). */
export type EditTarget =
  | { kind: "stock"; entryId: string | null }
  | { kind: "service"; entryId: string | null }
  | { kind: "inventory"; entryId: string | null; walletId: string }
  | null;
