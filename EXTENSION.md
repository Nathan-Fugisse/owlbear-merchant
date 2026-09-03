---
title: Merchant
description: Turn any token into a shop with fully custom currencies, stock, services and per-player wallets.
author: Nathan-Fugisse
image: https://raw.githubusercontent.com/Nathan-Fugisse/owlbear-merchant/main/preview/cover.png
icon: https://nathan-fugisse-owlbear-merchant.netlify.app/icon.svg
tags:
  - roleplay
  - utility
manifest: https://nathan-fugisse-owlbear-merchant.netlify.app/manifest.json
learn-more: https://github.com/Nathan-Fugisse/owlbear-merchant
---

# Merchant

Transform any token in your scene into a merchant with a full shop: stock, services, per-player
wallets and **fully configurable currencies**.

Inspired by the [yugen-merchant](https://github.com/yugenvtt/yugen-merchant) module for Foundry VTT.

![Screenshot of the shop screen](https://raw.githubusercontent.com/Nathan-Fugisse/owlbear-merchant/main/preview/cover.png)

## Features

- **Any token can be a shop** — right-click a token and pick the shop icon.
- **Configurable currencies** — add as many denominations as you want with custom name, plural,
  symbol, colour and conversion rate. Presets for `Gold / Silver / Copper` and a single-currency setup.
  Automatic change-making when a player pays with a bigger coin.
- **Buy / Sell / Services tabs** — price multipliers, payout multipliers, rarity multipliers, weight
  and stock control (`-1` = infinite).
- **Services create orders** for the GM to resolve (inn stays, repairs, healing, transport…).
- **Per-player wallets and inventories**, editable by the GM.
- **Transaction history**, storage usage meter and JSON backup/import.
- **Bilingual UI**: Portuguese (pt-BR) and English.

## How to use

1. As the GM, right-click a token and choose **Make shop**.
2. Open **Manage** and add items to the stock and any services.
3. Adjust the sell/payout multipliers and the merchant funds.
4. Players right-click the merchant token and choose **Open shop** (or use the extension action
   to list every shop in the scene).

## Currency configuration

Go to **Settings → Currency** (GM only):

| Field | Meaning |
| --- | --- |
| Name / Plural | Display names, e.g. `Gold` / `Gold` |
| Symbol | Short suffix shown next to prices, e.g. `gp` |
| Rate | How many **base units** one unit is worth (Gold 100, Silver 10, Copper 1) |
| Decimals | Allowed decimal places (0 = whole coins) |
| Colour | Colour used across the interface |

The first currency in the list is the main one and is used for totals.

## Install

Add this manifest URL in your Owlbear Rodeo profile:

```text
https://nathan-fugisse-owlbear-merchant.netlify.app/manifest.json
```

## Support

Open an issue at <https://github.com/Nathan-Fugisse/owlbear-merchant/issues>.
