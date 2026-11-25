# Vigia Energy ⚡

Versão atual: **2.6.1** (exibida no app: topo e ⚙️ → Configurações → Sobre).

PWA offline-first para controle de consumo de energia elétrica residencial. HTML/CSS/JS puro, sem frameworks, sem backend.

**URL (após ativar o Pages):** https://mpteixeirarj-glit.github.io/Vigia-energy-/

## Estrutura

```
index.html        Login local + hub dos três Vigias
common.css        Estilos compartilhados (pixel art)
auth.js           Login (Firebase) + destravamento offline (PBKDF2 local)
nuvem.js          Acesso ao Firebase (carregado sob demanda)
version.js        Versão do app + lista de novidades
energy/index.html App Vigia Energy
energy/app.js     Lógica: medidores, aparelhos multipotência, uso, calendário, pesquisa, relatório, config
sw.js             Service worker único (cobre / e /energy/)
manifest.json     Manifest PWA (start_url relativo)
fonts/            Press Start 2P hospedada localmente (OFL) — funciona offline
icon-*.png        Ícones gerados de icon-src.jpg (recorte 13%; maskable com zona segura)
```

## Como funciona o relatório

Para cada par de leituras consecutivas do medidor:

- **Medido** = leitura final − leitura inicial
- **Estimado** = soma de `W × min / 60 / 1000` dos usos cujo horário de **fim** cai no intervalo
- **Fundo** = medido − estimado (geladeira, standby, uso não anotado). Negativo indica erro de registro.
- **Fundo médio (W)** = fundo ÷ horas do intervalo — bom indicador de consumo "fantasma".

## Modelo de dados (v2)

Chave `ve_data_<uid>` (uma por conta):

```
{ versao: 2, tarifa, seeded,
  medidores: [{id, nome, mult}],
  leituras:  [{id, ts, kwh, medidorId}],
  aparelhos: [{id, nome, icone, obs, medidorId, potencias:[{rotulo, watts}]}],
  usos:      [{id, ts, aparelhoId, nome, icone, watts, potRotulo, minutos, qtd, medidorId}] }
```

Migração v1→v2 automática ao abrir: leituras sem medidor vão para "Medidor principal"
(ou `desconhecido` se já houver 2+ medidores); aparelhos com `watts` viram `potencias`.

## Nuvem (Firebase) — desde a v2.6

- Projeto Firebase **compartilhado com o Vigia Financeiro** (`vigia-56137`): mesmas contas (e-mail/senha ou Google).
- App Firebase com **nome próprio** (`vigia-energy`): a sessão do Energy não abre nem fecha a do Financeiro.
- Dados em `usuarios/{uid}/energia/` — `meta` (tarifa, medidores, aparelhos, lápides) e um documento por mês para
  `leituras_AAAA-MM` e `usos_AAAA-MM` (limite de 1 MB por documento). O Financeiro usa `usuarios/{uid}/dados` e `/config`.
- As regras atuais do projeto (`usuarios/{uid}/{documento=**}` só para o dono) já cobrem — nenhuma regra nova.
- **Offline-first**: o app abre e grava sempre no aparelho; a nuvem sincroniza em segundo plano.
- **Mescla por registro** (vence o `mod` mais recente); exclusões viajam como lápides (`apagados`), então nada "ressuscita".
- Contas antigas só locais (até v2.5) são criadas na nuvem no primeiro login online, com a mesma senha.

## Dados e limitações

- Tudo fica no `localStorage` do navegador, chave `ve_data_<uid>` por conta. Use **Config → Backup**.
- Sem internet, só entra quem já entrou online neste aparelho (senha verificada localmente).
- Os três Vigias em `mpteixeirarj-glit.github.io` compartilham a mesma origem (mesmo localStorage e mesmo Cache Storage). Este app usa só chaves `ve_` e caches `ve-`.

## Desenvolvimento

```
python3 -m http.server 8000   # abrir http://localhost:8000/
```

**A cada atualização**: suba `VE_VERSAO` em `version.js` (e adicione as novidades) **e** `VERSAO` em `sw.js` — os dois devem ser iguais. Sem mudar o `sw.js`, o navegador não instala a versão nova.
