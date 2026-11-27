/* Versão do Vigia Energy — fonte única exibida no app.
 * A CADA atualização: suba VE_VERSAO aqui E a constante VERSAO em sw.js
 * (o navegador só detecta service worker novo se o sw.js mudar). */
self.VE_VERSAO = '2.12.1';
self.VE_NOVIDADES = [
  { v: '2.12.1', itens: [
    'Hub: o Auto-Vigia passa a se chamar Vigia Auto, no padrão dos apps Vigia'
  ] },
  { v: '2.12.0', itens: [
    'Impostos pelas NF3e reais da Light/RJ: PIS 0,97% + COFINS 4,45%; ICMS 18% até 220 kWh, 20% até 300, 24% acima',
    'COSIP do Rio por faixa de consumo (R$ 9,39 a R$ 90), editável',
    '"Ver com impostos" nos ciclos e no resumo do período, com % da conta em tributos',
    'Config: tabelas de ICMS e COSIP editáveis, com a sua faixa destacada'
  ] },
  { v: '2.11.0', itens: [
    'Uso por horário: informe início e fim (ex.: 19:00 → 23:00); atravessa a meia-noite',
    'Conta com tributos: tarifa sem impostos + PIS, COFINS e ICMS "por dentro" + COSIP',
    'ICMS do Rio por faixa (isento até 50 kWh, 18% até 300, 24% acima) sobre a conta inteira',
    'COSIP da cidade do Rio: isenção até 120 kWh, valor configurável',
    'Calibrar pela minha conta: descobre a tarifa base a partir de uma conta real',
    'Avisos quando a projeção está perto de mudar de faixa'
  ] },
  { v: '2.10.0', itens: [
    'Registro de uso com Horas e Minutos (aceita 1,5 h ou 90 min)',
    'Atalhos de um toque: 15 min, 30 min, 1 h, 2 h, 4 h, 8 h',
    'Tempos exibidos como "4 h" ou "1 h 30 min" no histórico e na pesquisa',
    'Correção: em celulares de 320–360 px a tela ficava mais larga que o aparelho (zoom e toques fora do alvo)'
  ] },
  { v: '2.9.0', itens: [
    'Aba Medidor: Resumo do Período no topo (7/15/30 dias, mês atual ou datas livres)',
    'Consumo do período rateado entre leituras: não depende de ler exatamente nas datas',
    'Consumo do período também na Pesquisa',
    'Ordem ↓ recente / ↑ antiga no histórico de leituras e nos intervalos (fica salva)',
    'Toque na bandeira do topo para trocá-la ali mesmo'
  ] },
  { v: '2.8.0', itens: [
    'Leitura: data/hora visível, observação e marca de início de ciclo',
    'Validação pelos vizinhos no tempo, com opção de forçar (troca de medidor)',
    'Editar leitura (✏️) com marcas [CICLO] [RETRO] [EDIT] no histórico',
    'Ciclos de faturamento na aba Medidor, com custo pela tarifa por faixas',
    'Exclusão com confirmação no próprio app (sem a caixa do navegador)'
  ] },
  { v: '2.7.0', itens: [
    'Nuvem ativada no projeto Firebase exclusivo do Vigia Energy',
    'Conta deste aparelho é criada na nuvem no primeiro login online, com a mesma senha'
  ] },
  { v: '2.6.2', itens: [
    'Login volta a funcionar neste aparelho; nuvem desligada até o projeto exclusivo do Energy',
    'Energy deixa de usar o Firebase do Vigia Financeiro',
    'Login com Google só por janela (o redirect falhava em silêncio no app instalado)'
  ] },
  { v: '2.6.1', itens: ['Novo ícone do app (raio neon)'] },
  { v: '2.6.0', itens: [
    'Login com a conta do Vigia (e-mail/senha ou Google), com "Esqueci minha senha"',
    'Dados sincronizados na nuvem: recupera em outro celular ou após limpar o navegador',
    'Funciona offline: envia ao reconectar; indicador ☁ no topo',
    'Contas antigas deste aparelho migram para a nuvem no primeiro login'
  ] },
  { v: '2.5.0', itens: [
    'Início: card dos vilões (top 3) com período Hoje, 7 dias, 30 dias ou Tudo',
    'Atalho "Ver ranking completo" abre a Pesquisa no mesmo período'
  ] },
  { v: '2.4.0', itens: [
    'Nova aba Início: leitura, registro de uso, uso de hoje e último intervalo',
    'Aba Medidor só para medidores: editar, excluir e histórico paginado',
    'Relatório (resumo, simulação, vilões, intervalos) agora dentro da Pesquisa',
    'Config virou aba; opção de menu inferior ou lateral (☰ ou arrastar da borda)'
  ] },
  { v: '2.3.0', itens: [
    'Tarifa por faixas de consumo (referência Light nov/2026), editável',
    'Bandeira tarifária (verde, amarela, vermelha P1/P2) com acréscimos editáveis',
    'Indicador da bandeira no topo; toque para configurar',
    'Relatório: simulação da conta do mês por faixa + bandeira',
    'Custos de usos/dias/intervalos pela tarifa média efetiva do mês'
  ] },
  { v: '2.2.0', itens: [
    'Cadastro inicial em 4 passos: medidor, leitura inicial, aparelhos e tarifa',
    'Distribuidora no cadastro do medidor',
    'Importar backup direto no cadastro inicial (troca de celular)',
    'Botão "Redefinir app" nas Configurações'
  ] },
  { v: '2.1.0', itens: [
    'Botão "↻ Repetir agora" na aba Uso: registra de novo o último uso com o horário atual',
    'Desfazer por 6 segundos após repetir'
  ] },
  { v: '2.0.1', itens: [
    'PS5: repouso corrigido para 3 W; novo modo "Menu/streaming" (150 W)',
    'Lâmpadas LED: quantidade × potência de cada, com vários tipos no mesmo registro',
    'Novo tipo de aparelho: conjunto de lâmpadas'
  ] },
  { v: '2.0.0', itens: [
    'Relógio em tempo real no topo',
    'Vários medidores, com multiplicador',
    'Aparelhos com até 4 potências e lista pré-cadastrada',
    'Quantidade no registro de uso (ex.: lâmpadas)',
    'Abas Calendário e Pesquisa',
    'Relatório e Configurações no menu ⚙️'
  ] },
  { v: '1.0.0', itens: ['Primeira versão: medidor, aparelhos, uso, relatório, PDF, backup'] }
];
