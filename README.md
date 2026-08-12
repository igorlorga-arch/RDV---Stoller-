# RDV Stoller

App de controle de despesas de viagem — combustível, hospedagem, eventos e
alimentação, com orçamento mensal, gráficos, anotações e foto das notas
fiscais anexada a cada lançamento.

Os dados ficam salvos **no próprio navegador do celular** (não em nenhum
servidor). Isso significa: é grátis, funciona offline depois de instalado, mas
só existe naquele aparelho/navegador — se limpar os dados do navegador ou
trocar de celular, o histórico não vai junto sozinho.

---

## 1. Colocar no GitHub

1. Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. Clique em **New repository** (botão verde), dê o nome `rdv-stoller`,
   deixe como **Public** (o GitHub Pages grátis exige repositório público),
   e clique em **Create repository**.
3. No seu computador, dentro da pasta deste projeto, rode:

   ```bash
   git init
   git add .
   git commit -m "Primeira versão do RDV Stoller"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/rdv-stoller.git
   git push -u origin main
   ```

   (troque `SEU_USUARIO` pelo seu usuário do GitHub — o próprio GitHub mostra
   esse comando pronto na tela depois de criar o repositório).

---

## 2. Publicar no GitHub Pages (igual ao seu outro app)

Esse projeto já vem com um "robô" configurado (`.github/workflows/deploy.yml`)
que builda e publica o site sozinho, sem precisar instalar nada no seu
computador. Você só precisa ligar o Pages uma vez:

1. No repositório, vá em **Settings** (aba lá em cima).
2. No menu da esquerda, clique em **Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Pronto. Assim que você fizer o `git push` (passo anterior), o GitHub já
   builda e publica automaticamente. Acompanhe em **Actions** (aba lá em
   cima) até aparecer o ✅ verde — leva cerca de 1-2 minutos.
5. O link fica assim (mesmo padrão do seu `crm-stoller`):

   ```
   https://SEU_USUARIO.github.io/rdv-stoller/
   ```

   Ele aparece confirmado em **Settings → Pages**, no topo da página, com um
   botão "Visit site".

Toda vez que você mudar algo no código e der `git push` de novo, o site
atualiza sozinho.

---

## 3. Instalar no celular

1. Abra o link (`https://SEU_USUARIO.github.io/rdv-stoller/`) no **Safari**
   do iPhone (tem que ser Safari, não funciona pelo Chrome no iOS).
2. Toque no ícone de compartilhar (quadrado com seta pra cima, na barra
   inferior).
3. Role as opções e toque em **Adicionar à Tela de Início**.
4. Toque em **Adicionar** no canto superior direito.
5. Pronto — o ícone do RDV Stoller aparece na tela inicial, abre em tela
   cheia (sem barra de navegador) e funciona offline depois de aberto uma
   vez.

No Android é pelo Chrome: três pontinhos → **Adicionar à tela inicial**.

---

## Rodar localmente (opcional, pra testar antes de publicar)

Precisa ter o [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Pra gerar a versão de produção manualmente:

```bash
npm run build
npm run preview
```

---

## Estrutura do projeto

```
rdv-stoller/
├── src/
│   ├── App.jsx        → todo o app (telas, lógica, estilos)
│   └── main.jsx        → ponto de entrada + armazenamento local
├── public/
│   ├── icon-192.png     → ícone do app
│   └── icon-512.png
├── index.html
├── package.json
└── vite.config.js       → configuração do PWA (app instalável)
```

## Sobre o armazenamento

As fotos das notas fiscais são comprimidas antes de salvar, mas o
armazenamento do navegador (`localStorage`) tem um limite de alguns
megabytes por site. Se você registrar dezenas de fotos, pode valer a pena
de tempos em tempos exportar/anotar os valores importantes em outro lugar
como backup.
