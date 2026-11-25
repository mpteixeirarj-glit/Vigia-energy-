/* Versão do Vigia Energy — fonte única exibida no app.
 * A CADA atualização: suba VE_VERSAO aqui E a constante VERSAO em sw.js
 * (o navegador só detecta service worker novo se o sw.js mudar). */
self.VE_VERSAO = '2.0.0';
self.VE_NOVIDADES = [
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
