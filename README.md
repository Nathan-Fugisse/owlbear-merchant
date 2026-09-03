# owlbear-merchant

Extensão de **loja/mercador** para [Owlbear Rodeo](https://www.owlbear.rodeo/), inspirada no módulo
[yugen-merchant](https://github.com/yugenvtt/yugen-merchant) do Foundry VTT.

Transforme **qualquer token** da cena em uma loja: estoque, serviços, carteira individual por jogador,
compra/venda com multiplicadores e — o diferencial — **moedas 100% configuráveis** (nome, plural,
símbolo, cor e taxa de conversão).

Interface em **Português (PT-BR)** e **Inglês**, com seletor de idioma.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Instalando a extensão](#instalando-a-extensão)
- [Como usar](#como-usar)
- [Configurando a moeda](#configurando-a-moeda)
- [Desenvolvimento local](#desenvolvimento-local)
- [Publicando pelo GitHub](#publicando-pelo-github)
- [Atualizando a extensão](#atualizando-a-extensão)
- [Enviando para a loja oficial](#enviando-para-a-loja-oficial)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Solução de problemas](#solução-de-problemas)

---

## Funcionalidades

**Para o Mestre**

- Transforme qualquer token (camadas CHARACTER, MOUNT, PROP e ATTACHMENT) em mercador pelo menu de contexto.
- Painel **Gerenciar**: nome, mensagem de saudação, multiplicador de venda/compra, fundos infinitos,
  alcance de interação e multiplicadores por raridade.
- **Estoque** com quantidade (`-1` = infinito), preço por moeda, raridade, peso e descrição.
- **Serviços** (estalagem, conserto, cura…) que geram **pedidos** para o Mestre resolver.
- Edite a **carteira e o inventário de qualquer jogador** da sala.
- Histórico de transações, medidor de uso do metadata e backup/importação da configuração em JSON.

**Para os jogadores**

- Abrir a loja clicando com o botão direito no token (ícone de sacola) ou pela lista de lojas.
- Abas **Comprar / Vender / Serviços**, com preço final já calculado (multiplicadores + raridade).
- **Carteira** própria, com conversão automática entre denominações (paga com ouro, recebe troco em prata/cobre).
- **Inventário** próprio; vender para o mercador devolve o item ao estoque da loja.
- Acompanhar os próprios pedidos de serviço.

**Moedas**

- Quantas denominações quiser (1, 2, 3 ou mais), com nome, plural, símbolo, cor e **taxa de conversão**.
- Modelos prontos: `Ouro / Prata / Cobre`, `Duas moedas`, `Moeda única (Créditos)`.
- O sistema faz troco automático quebrando moedas maiores quando o jogador não tem o valor exato.

---

## Instalando a extensão

1. Abra <https://www.owlbear.rodeo/profile>.
2. Na caixa **Extensions**, clique em **Add +**.
3. Em **Add a custom extension**, cole a URL do manifesto:

```text
https://nathan-fugisse-owlbear-merchant.netlify.app/manifest.json
```

4. Clique em **Add** e, depois, **ative a extensão na sala** (menu `...` → Extensions).

---

## Como usar

### Mestre

1. **Clique com o botão direito** em um token da cena e escolha o ícone **“Tornar loja”** (a loja é criada
   e o painel de gerenciamento abre na hora).
2. Em **Gerenciar → Estoque → Adicionar item**, cadastre os produtos (nome, descrição, ícone, preço,
   moeda, raridade, peso e estoque).
3. Em **Serviços → Adicionar serviço**, cadastre serviços contratáveis.
4. Ajuste **multiplicadores** (preço cobrado / valor pago ao jogador) e os **fundos** do mercador.
5. Dê dinheiro aos jogadores na aba **Carteira** (como Mestre você edita a carteira de qualquer um).

### Jogador

1. **Clique com o botão direito** no token do mercador e escolha **“Abrir loja”**.
2. Compre, venda ou contrate serviços. O dinheiro sai da sua carteira e o item vai para seu inventário.
3. Acompanhe seus pedidos de serviço na aba **Pedidos**.

> **Dica:** o ícone do menu de contexto só aparece quando **exatamente 1 token** está selecionado.

---

## Configurando a moeda

Vá em **Configurações → Moeda** (somente Mestre):

| Campo             | O que faz                                                        |
| ----------------- | ---------------------------------------------------------------- |
| **Nome (singular)** | Nome da moeda, ex.: `Ouro`, `Zênite`, `Crédito`                 |
| **Plural**        | Forma no plural, ex.: `Ouros`                                     |
| **Símbolo**       | Sufixo curto exibido nos preços, ex.: `PO`, `z`, `CR`             |
| **Taxa**          | Quantas **unidades base** vale 1 unidade dessa moeda              |
| **Decimais**      | Casas decimais permitidas (`0` = inteiro)                         |
| **Cor**           | Cor usada na interface                                            |

A **taxa** é o coração do sistema. No padrão D&D:

```text
Ouro  = 100
Prata =  10
Cobre =   1
```

Ou seja, **1 Ouro = 10 Pratas = 100 Cobre**. Se você prefere uma moeda única, aplique o modelo
**Moeda única (Créditos)** (taxa 1) — tudo passa a ser medido em créditos.

- Use **Adicionar moeda** para criar denominações novas (ex.: `Platina` com taxa 1000).
- Use as setas para **reordenar** (a primeira é a moeda principal usada nos totais).
- **Configurações → Backup** exporta/importa a configuração de moedas em JSON — ótimo para reusar
  entre campanhas.

> Ao trocar as moedas, os valores nas carteiras são preservados por `id` de moeda; moedas removidas
> têm seus saldos descartados e preços apontando para elas voltam para a moeda principal.

---

## Desenvolvimento local

Requisitos: **Node.js 20+** e **npm**.

```bash
# 1. Entre na pasta do projeto
cd owlbear-merchant

# 2. Instale as dependências
npm install

# 3. Suba o servidor de desenvolvimento
npm run dev
```

O Vite vai mostrar algo como `Local: http://localhost:5173/`. Para testar dentro do Owlbear:

1. Abra <https://www.owlbear.rodeo/profile> → **Add +** → **Add a custom extension**.
2. Cole: `http://localhost:5173/manifest.json`
3. Entre numa sala, ative a extensão e **mantenha o `npm run dev` rodando**.

> O `vite.config.ts` já libera CORS para `https://www.owlbear.rodeo`. Sem isso o Owlbear não consegue
> carregar a página local.

### Outros comandos

```bash
npm run dev            # servidor de desenvolvimento (localhost:5173)
npm run typecheck      # checagem de tipos (TypeScript)
npm run build          # typecheck + build em dist/ (base "/")
npm run preview        # serve o dist/ localmente
```

---

## Publicando pelo Netlify

O repositório pode ser conectado diretamente ao Netlify. O projeto já contém `netlify.toml` e
`public/_headers` para publicar o build e permitir que o Owlbear faça o fetch do manifesto com CORS.

### Configuração

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node | `22` |

Depois do deploy, use como URL de instalação:

```text
https://nathan-fugisse-owlbear-merchant.netlify.app/manifest.json
```

Toda alteração enviada para `main` pode disparar um novo deploy automático.

---

## Atualizando a extensão

1. Suba a versão em **`package.json`** e **`public/manifest.json`** (mesmo valor).
2. Commit e push em `main`:

```bash
npm version 1.1.0 --no-git-tag-version   # ou edite os arquivos manualmente
# atualize também "version" em public/manifest.json
git add .
git commit -m "release: v1.1.0"
git push
```

3. (Opcional) Crie uma release com o zip do `dist/`:

```bash
git tag v1.1.0
git push origin v1.1.0
```

A action `release.yml` roda o build, gera `owlbear-merchant-dist.zip` e anexa na release.

> O Owlbear usa o campo `version` do manifesto para avisar sobre atualizações. Mantenha os dois
> arquivos sincronizados.

---

## Enviando para a loja oficial

Com a extensão hospedada e funcionando, você pode listá-la em <https://extensions.owlbear.rodeo>:

1. Ajuste o front matter de **`EXTENSION.md`** (título, descrição, autor, imagem de capa, ícone, tags
   e o link do `manifest`).
2. Faça um fork de <https://github.com/owlbear-rodeo/extensions>.
3. Edite o `extensions.json` do fork adicionando sua extensão no final:

```json
{
  "owlbear-merchant": "https://raw.githubusercontent.com/Nathan-Fugisse/owlbear-merchant/main/EXTENSION.md"
}
```

4. Abra um **Pull Request** para a branch `main` do repositório deles com **um único commit**.
5. Depois de aceito e mergeado, a extensão aparece na loja.

Requisitos deles: extensão hospedada, funcional, markdown público com front matter válido,
imagens externas válidas e tags existentes.

---

## Estrutura do projeto

```text
owlbear-merchant/
├─ public/
│  ├─ manifest.json      # manifesto da extensão
│  ├─ _headers           # CORS/headers do Netlify
│  └─ icon*.svg          # ícones da action e do menu de contexto
├─ src/
│  ├─ background.ts      # registra o item de menu de contexto
│  ├─ main.ts            # bootstrap + eventos (click/change/input)
│  ├─ render.ts          # composição das telas
│  ├─ state.ts           # integração com o SDK (room/scene/player) e escritas
│  ├─ actions.ts         # comprar, vender, contratar, carteira
│  ├─ currency.ts        # toda a matemática de moedas e troco
│  ├─ defaults.ts        # valores padrão e sanitização dos dados
│  ├─ i18n.ts            # strings PT-BR / EN
│  ├─ editor.ts          # rascunho do formulário de item/serviço
│  ├─ ui.ts              # helpers de HTML
│  ├─ style.css
│  └─ views/             # shops, wallet, orders, settings, shop
├─ index.html            # popover (app)
├─ background.html       # script de fundo
├─ EXTENSION.md          # markdown para a loja oficial
└─ vite.config.ts
```

### Onde os dados são guardados

| Dado                             | Onde                                    |
| -------------------------------- | --------------------------------------- |
| Lojas (estoque, serviços, fundos)| **metadata do token** (`.../shop`)      |
| Moedas, economia, histórico      | **metadata da sala** (`.../settings`)   |
| Carteiras e inventários          | **metadata da sala** (`.../wallets`)    |
| Pedidos de serviços              | **metadata da sala** (`.../orders`)     |

Tudo prefixado com o `EXTENSION_ID` para não colidir com outras extensões.

---

## Solução de problemas

**“A extensão não carrega / dá erro ao adicionar o manifesto”**
- Confira se a URL termina em `manifest.json` e se o site está público.
- O servidor precisa enviar CORS. O Netlify recebe essa configuração por `public/_headers`; o `npm run dev` também libera CORS localmente.

**“Não consigo alterar a loja / o estoque não muda”**
- Jogadores precisam de permissão de edição de cena (menu `...` → Permissions). Sem isso o Owlbear
  bloqueia a escrita no token e a extensão avisa.

**“A aba Configurações não aparece”**
- Ela é exclusiva do Mestre. Confira sua role na sala.

**“O metadata da sala está no limite”**
- A configuração usa o `settings.storage` para avisar. Limpe o histórico, remova carteiras de
  jogadores ausentes e evite estoques gigantes em um único token.

---

## Licença

MIT — veja [LICENSE](./LICENSE).
