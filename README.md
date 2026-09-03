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

---

## Funcionalidades

**Para o Mestre**

- Transforme qualquer token (camadas CHARACTER, MOUNT, PROP e ATTACHMENT) em mercador pelo menu de contexto.
- Painel **Gerenciar**: nome, mensagem de saudação, multiplicador de venda/compra, fundos infinitos,
  multiplicadores por raridade.
- **Estoque** com quantidade (`-1` = infinito), preço por moeda, raridade, peso e descrição.
- **Serviços** (estalagem, conserto, cura…) que geram **pedidos** para o Mestre resolver.
- Edite a **carteira e o inventário de qualquer jogador** da sala.
- Histórico de transações, armazenamento local por sala e exportação de backup em JSON.

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
https://owlbear-merchant.vercel.app/manifest.json
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
