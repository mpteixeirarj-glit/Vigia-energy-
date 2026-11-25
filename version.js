/* Versão do Vigia Energy — fonte única exibida no app.
 * A CADA atualização: suba VE_VERSAO aqui E a constante VERSAO em sw.js
 * (o navegador só detecta service worker novo se o sw.js mudar). */
self.VE_VERSAO = '2.2.0';
self.VE_NOVIDADES = [
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
