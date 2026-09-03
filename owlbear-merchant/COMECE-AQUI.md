# Comece aqui · owlbear-merchant

Extensão de loja/mercador para o [Owlbear Rodeo](https://www.owlbear.rodeo/), com moedas totalmente configuráveis.

## Publicação no Netlify

O projeto está preparado para ser conectado ao GitHub e publicado pelo Netlify.

1. Suba este projeto para `https://github.com/Nathan-Fugisse/owlbear-merchant`.
2. No Netlify, importe o repositório `Nathan-Fugisse/owlbear-merchant`.
3. Use:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node: `22`
4. Depois do deploy, o manifesto será:

```text
https://nathan-fugisse-owlbear-merchant.netlify.app/manifest.json
```

5. No Owlbear Rodeo: **Profile → Add + → Add a custom extension** e cole a URL acima.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para testar localmente no Owlbear, use `http://localhost:5173/manifest.json` enquanto o servidor estiver rodando.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run typecheck` | checagem de tipos TypeScript |
| `npm run build` | gera a versão de produção em `dist/` |
| `npm run preview` | serve o build localmente |

## Importante

O `EXTENSION_ID` em `src/constants.ts` não deve ser alterado depois que a extensão começar a ser usada, pois ele faz parte das chaves de metadata onde lojas, carteiras e configurações são armazenadas.
