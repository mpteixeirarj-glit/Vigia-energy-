/* Vigia Energy — lógica do app.
 * Dados por conta em localStorage, chave `ve_data_<uid>` (ver migrar()). */
(function () {
  'use strict';
  var sessao = VigiaAuth.sessao();
  if (!sessao) return;
  var CHAVE = 've_data_' + sessao.uid;
  var VERSAO = self.VE_VERSAO || '?';
  var DESCONHECIDO = 'desconhecido';
  var ICONES = ['🚿', '❄️', '📺', '🎮', '🌀', '🌬️', '🍳', '💡', '🧊', '🧺', '👕', '💦', '🔥', '💻', '🖥️', '☕', '🔌', '🛁', '💇', '🍞', '🔋', '🏊', '⚙️'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var $ = function (id) { return document.getElementById(id); };

  // PS5: "repouso" (rest mode) gasta poucos watts; 150 W é menu/streaming (corrigido na v2.0.1)
  var PS5_ANTIGO = JSON.stringify([{ rotulo: 'Repouso', watts: 150 }, { rotulo: 'Jogo intenso', watts: 200 }]);
  var PS5_NOVO = [{ rotulo: 'Repouso (rest mode)', watts: 3 }, { rotulo: 'Menu/streaming', watts: 150 }, { rotulo: 'Jogo intenso', watts: 200 }];
  var LED_ANTIGO = JSON.stringify([{ rotulo: 'Por lâmpada (8W)', watts: 8 }, { rotulo: 'Por lâmpada (12W)', watts: 12 }]);
  var OBS_LED = 'No uso, informe quantas lâmpadas e a potência de cada uma';
  var LAMP_W = [3, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 40];
  var MAX_LAMP_LINHAS = 6;

  // Aparelhos pré-cadastrados (carregados uma única vez por conta, se a lista estiver vazia)
  var PRE = [
    { nome: 'Ar-condicionado', emoji: '❄️', potencias: [{ rotulo: 'Normal', watts: 1080 }] },
    { nome: 'Chuveiro Lorenzetti Fashion', emoji: '🚿', potencias: [
      { rotulo: 'Posição 1 (desligado)', watts: 0 }, { rotulo: 'Posição 2 (morno)', watts: 2600 },
      { rotulo: 'Posição 3 (quente)', watts: 5000 }, { rotulo: 'Posição 4 (máximo)', watts: 6800 }] },
    { nome: 'Geladeira LG Inverter', emoji: '🧊', potencias: [{ rotulo: 'Consumo diário fixo', watts: 50 }],
      observacao: 'Equivale a ~1,2 kWh/dia; registrar como 24h de uso' },
    { nome: 'Máquina de Lavar Brastemp', emoji: '🌀', potencias: [{ rotulo: 'Ciclo completo', watts: 1500 }],
      observacao: '0,37 kWh por ciclo (~15 min equivalentes)' },
    { nome: 'Ferro a Vapor Philips', emoji: '👕', potencias: [{ rotulo: 'Baixo', watts: 1400 }, { rotulo: 'Alto', watts: 2000 }] },
    { nome: 'TV LG 55" NanoCell', emoji: '📺', potencias: [
      { rotulo: 'Baixo brilho', watts: 95 }, { rotulo: 'Brilho normal', watts: 130 }, { rotulo: 'Alto brilho', watts: 165 }] },
    { nome: 'PS5', emoji: '🎮', potencias: PS5_NOVO },
    { nome: 'Ventilador de Teto', emoji: '🌬️', potencias: [
      { rotulo: 'Velocidade 1', watts: 50 }, { rotulo: 'Velocidade 2', watts: 65 }, { rotulo: 'Velocidade 3', watts: 80 }] },
    { nome: 'Lava-Jato Kärcher K2.500', emoji: '💦', potencias: [{ rotulo: 'Normal', watts: 1400 }, { rotulo: 'Máximo', watts: 1650 }] },
    { nome: 'Iluminação LED', emoji: '💡', tipo: 'lampadas', potencias: [{ rotulo: 'Por lâmpada', watts: 9 }], observacao: OBS_LED }
  ];

  // ───────── dados ─────────
  function vazio() { return { versao: 2, tarifa: 1, seeded: false, onboarding: false, medidores: [], leituras: [], aparelhos: [], usos: [] }; }
  function seeds() {
    return PRE.map(function (p) {
      return { id: novoId(), nome: p.nome, icone: p.emoji, obs: p.observacao || '', medidorId: '', tipo: p.tipo || '',
        potencias: p.potencias.map(function (x) { return { rotulo: x.rotulo, watts: x.watts }; }) };
    });
  }
  function novoId() {
    var a = new Uint32Array(2); crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  }
  /* Migração v1 → v2 (idempotente):
   *  - leituras sem medidorId: 0 medidores → cria "Medidor principal"; 1 → associa; 2+ → "desconhecido"
   *  - aparelho {watts} → {potencias:[{rotulo:'Normal', watts}]}
   *  - usos ganham qtd=1
   *  - pré-cadastro só se a lista de aparelhos estiver vazia e nunca tiver sido semeada */
  function migrar(d) {
    var tinhaFlag = !!(d && Object.prototype.hasOwnProperty.call(d, 'onboarding'));
    d = Object.assign(vazio(), d || {});
    ['medidores', 'leituras', 'aparelhos', 'usos'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    var orfas = d.leituras.filter(function (l) { return !l.medidorId; });
    if (orfas.length) {
      if (!d.medidores.length) d.medidores.push({ id: novoId(), nome: 'Medidor principal', mult: 1 });
      var alvo = d.medidores.length === 1 ? d.medidores[0].id : DESCONHECIDO;
      orfas.forEach(function (l) { l.medidorId = alvo; });
    }
    d.medidores.forEach(function (m) { if (!(m.mult > 0)) m.mult = 1; });
    d.aparelhos.forEach(function (a) {
      if (!Array.isArray(a.potencias) || !a.potencias.length) a.potencias = [{ rotulo: 'Normal', watts: Number(a.watts) || 0 }];
      delete a.watts;
      if (!a.icone) a.icone = '🔌';
    });
    d.aparelhos.forEach(function (a) {
      var pj = JSON.stringify(a.potencias.map(function (p) { return { rotulo: p.rotulo, watts: p.watts }; }));
      if (a.nome === 'PS5' && pj === PS5_ANTIGO) a.potencias = PS5_NOVO.map(function (p) { return { rotulo: p.rotulo, watts: p.watts }; });
      if (a.nome === 'Iluminação LED' && !a.tipo && pj === LED_ANTIGO) {
        a.tipo = 'lampadas'; a.potencias = [{ rotulo: 'Por lâmpada', watts: 9 }]; a.obs = OBS_LED;
      }
    });
    d.usos.forEach(function (u) { if (!(u.qtd > 0)) u.qtd = 1; if (u.potRotulo == null) u.potRotulo = ''; });
    if (!d.seeded) {
      if (!d.aparelhos.length) {
        d.aparelhos = seeds();
      }
      d.seeded = true;
    }
    // contas anteriores à v2.2 que já têm medidor não passam pelo onboarding
    if (!tinhaFlag) d.onboarding = d.medidores.length > 0;
    d.versao = 2;
    return d;
  }
  function carregar() {
    try { var bruto = JSON.parse(localStorage.getItem(CHAVE)); if (bruto) return migrar(bruto); } catch (e) {}
    return migrar(vazio());
  }
  var D = carregar();
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(D)); }
    catch (e) { toast('ERRO AO SALVAR: armazenamento cheio?'); }
  }
  salvar(); // persiste migração/pré-cadastro

  // ───────── formatação ─────────
  var nf = function (n, c) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }); };
  var kwh = function (n) { return nf(n, Math.abs(n) < 10 ? 3 : 2) + ' kWh'; };
  var brl = function (n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var dt = function (iso) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  var hora = function (iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  function diaKey(d) { d = new Date(d); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function numero(s) {
    s = String(s == null ? '' : s).trim().replace(/\s/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return s !== '' && isFinite(n) ? n : NaN;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function agoraLocal() {
    var d = new Date(); d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function lerTs(input) {
    if (!input.value) return new Date().toISOString();
    var d = new Date(input.value);
    return isNaN(d) ? new Date().toISOString() : d.toISOString();
  }
  // toast(msg) simples, ou toast(msg, 'DESFAZER', fn) com botão de ação (fica 6 s)
  function toast(msg, rotulo, acao) {
    var t = $('toast'); t.textContent = msg; t.style.display = 'block';
    if (rotulo && acao) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'toast-acao'; b.textContent = rotulo;
      b.onclick = function () { t.style.display = 'none'; acao(); };
      t.appendChild(b);
    }
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = 'none'; }, rotulo ? 6000 : 2600);
  }
  var kwhDe = function (watts, minutos, qtd) { return (watts * minutos / 60) / 1000 * (qtd || 1); };
  var kwhUso = function (u) { return kwhDe(u.watts, u.minutos, u.qtd); };
  var ord = function (arr) { return arr.slice().sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; }); };
  function medidor(id) { return D.medidores.find(function (m) { return m.id === id; }); }
  function nomeMed(id) {
    if (id === DESCONHECIDO) return 'Medidor desconhecido';
    var m = medidor(id); return m ? m.nome : 'Medidor removido';
  }
  function aparelho(id) { return D.aparelhos.find(function (a) { return a.id === id; }); }
  function potTxt(u) { return (u.potRotulo ? u.potRotulo + ' · ' : '') + nf(u.watts, 0) + ' W' + (u.qtd > 1 ? ' × ' + nf(u.qtd, 0) : ''); }
  var ehLamp = function (a) { return !!(a && a.tipo === 'lampadas'); };
  function lampTxt(ls) { return ls.map(function (l) { return nf(l.qtd, 0) + '×' + nf(l.w, 0) + ' W'; }).join(' + '); }
  function faixaW(a) {
    if (ehLamp(a)) return 'qtd. × W';
    var ws = a.potencias.map(function (p) { return p.watts; });
    var mn = Math.min.apply(null, ws), mx = Math.max.apply(null, ws);
    return mn === mx ? nf(mx, 0) + ' W' : nf(mn, 0) + '–' + nf(mx, 0) + ' W';
  }
  /* Em qual medidor um uso entra: o do aparelho (atual), senão o gravado no uso;
   * sem definição e com um único medidor → esse medidor. */
  function medDoUso(u) {
    var a = aparelho(u.aparelhoId);
    var id = (a && a.medidorId) || u.medidorId || '';
    if (!id && D.medidores.length === 1) id = D.medidores[0].id;
    return id;
  }

  // ───────── cálculo do relatório (puro sobre D) ─────────
  function calcular() {
    var L = ord(D.leituras), U = ord(D.usos), t = D.tarifa;
    var ids = [];
    L.forEach(function (l) { if (ids.indexOf(l.medidorId) < 0) ids.push(l.medidorId); });
    var grupos = ids.map(function (id) {
      var m = medidor(id), mult = m ? m.mult : 1;
      var LL = L.filter(function (l) { return l.medidorId === id; });
      var Um = U.filter(function (u) { return medDoUso(u) === id; });
      var intervalos = [];
      for (var i = 1; i < LL.length; i++) {
        var a = LL[i - 1], b = LL[i];
        // uso pertence ao intervalo pelo horário em que TERMINOU: (a, b]
        var dentro = Um.filter(function (u) { return u.ts > a.ts && u.ts <= b.ts; });
        var est = dentro.reduce(function (s, u) { return s + kwhUso(u); }, 0);
        var med = (b.kwh - a.kwh) * mult;
        var horas = (new Date(b.ts) - new Date(a.ts)) / 36e5;
        intervalos.push({ de: a.ts, ate: b.ts, horas: horas, medido: med, estimado: est, fundo: med - est,
          nUsos: dentro.length, wFundo: horas > 0 ? (med - est) / horas * 1000 : 0 });
      }
      var total = LL.length > 1 ? (LL[LL.length - 1].kwh - LL[0].kwh) * mult : 0;
      var dias = LL.length > 1 ? (new Date(LL[LL.length - 1].ts) - new Date(LL[0].ts)) / 864e5 : 0;
      return { id: id, nome: nomeMed(id), mult: mult, n: LL.length, intervalos: intervalos, total: total, dias: dias,
        porDia: dias >= 0.5 ? total / dias : null };
    });
    var rank = {};
    U.forEach(function (u) {
      var k = u.aparelhoId;
      if (!rank[k]) rank[k] = { nome: u.nome, icone: u.icone, kwh: 0, min: 0 };
      rank[k].kwh += kwhUso(u); rank[k].min += u.minutos;
    });
    var ranking = Object.keys(rank).map(function (k) { return rank[k]; }).sort(function (x, y) { return y.kwh - x.kwh; });
    var semMed = D.medidores.length > 1 ? U.filter(function (u) { return !medDoUso(u); }).length : 0;
    var comTaxa = grupos.filter(function (g) { return g.porDia !== null; });
    var dias = L.length > 1 ? (new Date(L[L.length - 1].ts) - new Date(L[0].ts)) / 864e5 : 0;
    return {
      grupos: grupos, ranking: ranking, semMed: semMed, tarifa: t, dias: dias,
      total: grupos.reduce(function (s, g) { return s + g.total; }, 0),
      porDia: comTaxa.length ? comTaxa.reduce(function (s, g) { return s + g.porDia; }, 0) : null,
      diasMin: comTaxa.length ? Math.min.apply(null, comTaxa.map(function (g) { return g.dias; })) : 0,
      usosTotalKwh: ranking.reduce(function (s, r) { return s + r.kwh; }, 0)
    };
  }

  // ───────── relógio ─────────
  function tique() {
    var d = new Date();
    $('relogio').textContent = DIAS[d.getDay()] + ', ' + d.toLocaleDateString('pt-BR') + '   ' + d.toLocaleTimeString('pt-BR');
    $('relogio').setAttribute('datetime', d.toISOString());
  }
  tique(); setInterval(tique, 1000);

  // ───────── render ─────────
  function render() {
    if (precisaOnboarding()) { mostrarOnboarding(); return; }
    fecharOnboarding();
    renderMedidores(); renderLeituras(); renderAparelhos(); renderUsos(); renderRepetir();
    renderCalendario(); renderFiltros();
    if (abaAtual === 'relatorio') renderRelatorio();
    if (!$('p-res').hidden) pesquisar();
    $('c-tarifa').value = nf(D.tarifa, 2);
    $('c-conta').textContent = 'Conta: ' + sessao.email;
  }

  function opcoesMedidores(sel, extra) {
    var atual = sel.value;
    sel.innerHTML = (extra || '') + D.medidores.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.nome) + (m.mult !== 1 ? ' (×' + nf(m.mult, 2) + ')' : '') + '</option>';
    }).join('');
    if (atual && Array.prototype.some.call(sel.options, function (o) { return o.value === atual; })) sel.value = atual;
  }

  function renderMedidores() {
    var M = D.medidores;
    $('m-lista').innerHTML = M.length ? M.map(function (m) {
      var n = D.leituras.filter(function (l) { return l.medidorId === m.id; }).length;
      return '<li><span class="ic">📟</span><span class="info"><b>' + esc(m.nome) + '</b><small class="num">' + (m.distribuidora ? esc(m.distribuidora) + ' · ' : '') + 'multiplicador ×' + nf(m.mult, 2) +
        ' · ' + n + ' leitura' + (n === 1 ? '' : 's') + '</small></span><button type="button" class="x" data-del-m="' + m.id + '" aria-label="Excluir medidor">✕</button></li>';
    }).join('') : '<li class="vazio">Nenhum medidor cadastrado.</li>';
    // leitura: dropdown só se houver mais de um
    opcoesMedidores($('l-med'), M.length > 1 ? '<option value="">— escolha o medidor —</option>' : '');
    $('l-campo-med').hidden = M.length < 2;
    $('l-med').required = M.length > 1;
    $('l-sem-med').hidden = M.length > 0;
    $('l-btn').disabled = !M.length;
    // aparelho: escolher medidor só faz sentido com 2+
    opcoesMedidores($('a-med'), '<option value="">— não definido —</option>');
    $('a-campo-med').hidden = M.length < 2;
  }

  function renderLeituras() {
    var L = ord(D.leituras).reverse();
    var multi = D.medidores.length > 1 || L.some(function (l) { return !medidor(l.medidorId); });
    $('l-lista').innerHTML = L.length ? L.slice(0, 100).map(function (l) {
      var ant = L.find(function (x) { return x.medidorId === l.medidorId && x.ts < l.ts; });
      var dif = ant ? l.kwh - ant.kwh : null;
      return '<li><span class="ic">⚡</span><span class="info"><b class="num">' + nf(l.kwh, 1) + ' kWh</b><small>' +
        (multi ? esc(nomeMed(l.medidorId)) + ' · ' : '') + dt(l.ts) +
        (dif !== null ? ' · <span class="' + (dif < 0 ? 'neg' : 'pos') + '">' + (dif >= 0 ? '+' : '') + nf(dif, 2) + '</span>' : '') +
        '</small></span><button type="button" class="x" data-del-l="' + l.id + '" aria-label="Excluir">✕</button></li>';
    }).join('') : '<li class="vazio">Nenhuma leitura ainda. Vá até o relógio e anote o número.</li>';
    atualizaPrevLeitura();
  }
  function medLeituraAtual() { return D.medidores.length === 1 ? D.medidores[0].id : $('l-med').value; }
  function atualizaPrevLeitura() {
    var id = medLeituraAtual();
    var ult = ord(D.leituras).filter(function (l) { return l.medidorId === id; }).pop();
    $('l-prev').textContent = ult ? 'Última deste medidor: ' + nf(ult.kwh, 1) + ' kWh em ' + dt(ult.ts) : '';
  }

  function renderAparelhos() {
    var A = D.aparelhos;
    $('a-lista').innerHTML = A.length ? A.map(function (a) {
      var mx = Math.max.apply(null, a.potencias.map(function (p) { return p.watts; }));
      return '<li><span class="ic">' + a.icone + '</span><span class="info"><b>' + esc(a.nome) + '</b><small class="num">' + faixaW(a) +
        (ehLamp(a) ? ' · ' + brl(kwhDe(10, 60) * D.tarifa) + '/h por 10 W' :
          (a.potencias.length > 1 ? ' · ' + a.potencias.length + ' potências' : '') + ' · até ' + brl(kwhDe(mx, 60) * D.tarifa) + '/h') +
        '</small>' + (D.medidores.length > 1 ? '<select class="sel-med" data-ap-med="' + a.id + '" aria-label="Medidor do aparelho">' +
          '<option value="">— medidor não definido —</option>' + D.medidores.map(function (m) {
            return '<option value="' + m.id + '"' + (m.id === a.medidorId ? ' selected' : '') + '>📟 ' + esc(m.nome) + '</option>';
          }).join('') + '</select>' : '') + (a.obs ? '<small style="display:block;color:var(--amarelo)">' + esc(a.obs) + '</small>' : '') +
        '</span><button type="button" class="x" data-del-a="' + a.id + '" aria-label="Excluir">✕</button></li>';
    }).join('') : '<li class="vazio">Cadastre seus aparelhos. A potência fica na etiqueta.</li>';
    var sel = $('u-ap'), atual = sel.value;
    sel.innerHTML = A.length ? A.map(function (a) { return '<option value="' + a.id + '">' + a.icone + ' ' + esc(a.nome) + ' (' + faixaW(a) + ')</option>'; }).join('')
      : '<option value="">— cadastre um aparelho primeiro —</option>';
    if (atual && aparelho(atual)) sel.value = atual;
    atualizaPotencias();
  }

  // linhas "quantidade × W" para conjuntos de lâmpadas
  function linhaLamp(q, w) {
    return '<div class="pot-linha lamp-linha"><input class="num" inputmode="numeric" value="' + (q || '') + '" placeholder="Qtd." aria-label="Quantidade de lâmpadas">' +
      '<span class="vezes">×</span><input class="num" inputmode="decimal" list="lamp-w" value="' + (w || '') + '" placeholder="W" aria-label="Potência de cada lâmpada (W)">' +
      '<button type="button" class="x lamp-del" aria-label="Remover linha">✕</button></div>';
  }
  function preencheLamps(a) {
    var ult = ord(D.usos).filter(function (u) { return u.aparelhoId === a.id && Array.isArray(u.lampadas); }).pop();
    var ls = ult ? ult.lampadas : [{ qtd: 1, w: a.potencias[0] ? a.potencias[0].watts : 9 }];
    $('u-lamps').innerHTML = ls.map(function (l) { return linhaLamp(l.qtd, l.w); }).join('');
    $('u-lamp-dica').textContent = ult ? 'Preenchido com o último uso deste aparelho.' : '';
  }
  function lerLamps() {
    var out = [], ok = true;
    document.querySelectorAll('#u-lamps .lamp-linha').forEach(function (r) {
      var ins = r.querySelectorAll('input'), qt = ins[0].value.trim(), wt = ins[1].value.trim();
      if (qt === '' && wt === '') return;
      var q = numero(qt), w = numero(wt);
      if (!(q >= 1 && q <= 500 && q === Math.floor(q)) || !(w > 0 && w <= 500)) { ok = false; return; }
      out.push({ qtd: q, w: w });
    });
    return ok ? out : null;
  }

  function atualizaPotencias() {
    var a = aparelho($('u-ap').value), sel = $('u-pot'), atual = sel.value;
    var lamp = ehLamp(a);
    $('u-campo-lamp').hidden = !lamp; $('u-campo-qtd').hidden = lamp;
    if (lamp && $('u-lamps').dataset.ap !== a.id) { preencheLamps(a); $('u-lamps').dataset.ap = a.id; }
    var multi = !!(a && a.potencias.length > 1) && !lamp;
    $('u-campo-pot').hidden = !multi;
    sel.innerHTML = a ? a.potencias.map(function (p, i) { return '<option value="' + i + '">' + esc(p.rotulo) + ' — ' + nf(p.watts, 0) + ' W</option>'; }).join('') : '';
    if (multi) sel.value = atual && Number(atual) < a.potencias.length ? atual : String(Math.min(1, a.potencias.length - 1));
    $('u-obs').hidden = !(a && a.obs);
    $('u-obs').textContent = a && a.obs ? a.obs : '';
    previewUso();
  }
  function usoDoForm() {
    var a = aparelho($('u-ap').value); if (!a) return null;
    if (ehLamp(a)) {
      var ls = lerLamps(), tw = ls ? ls.reduce(function (s, l) { return s + l.qtd * l.w; }, 0) : NaN;
      return { a: a, p: { rotulo: ls ? lampTxt(ls) : '', watts: tw }, m: numero($('u-min').value), q: 1, lampadas: ls };
    }
    var p = a.potencias[Number($('u-pot').value) || 0] || a.potencias[0];
    var q = numero($('u-qtd').value);
    return { a: a, p: p, m: numero($('u-min').value), q: $('u-qtd').value.trim() === '' ? 1 : q };
  }
  function previewUso() {
    var f = usoDoForm();
    var extra = f && f.lampadas && f.lampadas.length ? '<span class="num">' + esc(f.p.rotulo) + ' = ' + nf(f.p.watts, 0) + ' W</span><br>' : '';
    if (f && f.lampadas === null) { $('u-prev').innerHTML = '<span class="neg">Confira quantidade (inteiro) e potência (W) das lâmpadas.</span>'; return; }
    $('u-prev').innerHTML = f && f.m > 0 && f.q > 0 && f.p.watts > 0 ? extra + '≈ <span class="num">' + kwh(kwhDe(f.p.watts, f.m, f.q)) + ' · ' + brl(kwhDe(f.p.watts, f.m, f.q) * D.tarifa) + '</span>' : '';
  }

  /* ↻ Repetir último uso: o último REGISTRADO (ordem de inclusão, não de horário —
   * quem lança um uso de ontem espera repetir esse). Registra na hora, com "agora". */
  function ultimoUso() { return D.usos.length ? D.usos[D.usos.length - 1] : null; }
  function renderRepetir() {
    var u = ultimoUso();
    $('u-repetir-card').hidden = !u;
    if (!u) return;
    var k = kwhUso(u);
    $('u-repetir-desc').innerHTML = u.icone + ' ' + esc(u.nome) + '<br><span class="num">' + esc(potTxt(u)) + ' · ' + nf(u.minutos, 0) + ' min · ' +
      kwh(k) + ' · ' + brl(k * D.tarifa) + '</span>' +
      (aparelho(u.aparelhoId) ? '' : '<br><span class="neg">Aparelho excluído — repete com os dados gravados.</span>');
  }
  function repetirUltimo() {
    var u = ultimoUso(); if (!u) return;
    var a = aparelho(u.aparelhoId);
    var novo = Object.assign({}, u, { id: novoId(), ts: new Date().toISOString(),
      medidorId: (a && a.medidorId) || u.medidorId || '' });
    if (u.lampadas) novo.lampadas = u.lampadas.map(function (l) { return { qtd: l.qtd, w: l.w }; });
    D.usos.push(novo); salvar(); render();
    toast('REPETIDO: ' + u.nome.toUpperCase() + ' ✓', 'DESFAZER', function () {
      D.usos = D.usos.filter(function (x) { return x.id !== novo.id; }); salvar(); render(); toast('DESFEITO');
    });
  }
  $('u-repetir').onclick = repetirUltimo;

  function renderUsos() {
    var U = ord(D.usos).reverse().slice(0, 200);
    $('u-lista').innerHTML = U.length ? U.map(linhaUso).join('') : '<li class="vazio">Nenhum uso registrado.</li>';
  }
  function linhaUso(u, semExcluir) {
    var k = kwhUso(u);
    return '<li><span class="ic">' + u.icone + '</span><span class="info"><b>' + esc(u.nome) + '</b><small><span class="num">' + esc(potTxt(u)) + '<br>' + nf(u.minutos, 0) +
      ' min · ' + kwh(k) + ' · ' + brl(k * D.tarifa) + '</span><br>' + dt(u.ts) + '</small></span>' +
      (semExcluir === true ? '' : '<button type="button" class="x" data-del-u="' + u.id + '" aria-label="Excluir">✕</button>') + '</li>';
  }

  function kpi(rot, v, s) { return '<div class="kpi"><div class="r">' + rot + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }

  function renderRelatorio() {
    var R = calcular(), t = D.tarifa;
    var k = '';
    k += kpi('MEDIDO TOTAL', R.total ? kwh(R.total) : '—', R.total ? brl(R.total * t) : 'precisa de 2 leituras');
    k += kpi('PERÍODO', R.dias ? nf(R.dias, 1) + ' dias' : '—', D.leituras.length + ' leituras · ' + R.grupos.length + ' medidor' + (R.grupos.length === 1 ? '' : 'es'));
    k += kpi('MÉDIA/DIA', R.porDia !== null ? kwh(R.porDia) : '—', R.porDia !== null ? brl(R.porDia * t) : '');
    k += kpi('PROJEÇÃO 30 DIAS', R.porDia !== null ? brl(R.porDia * 30 * t) : '—', R.porDia !== null ? kwh(R.porDia * 30) : '');
    $('r-kpis').innerHTML = k + (R.porDia !== null && R.diasMin < 3 ? '<p class="dim" style="grid-column:1/-1;font-size:12px">Projeção com menos de 3 dias de dados é pouco confiável.</p>' : '');

    var max = R.ranking.length ? R.ranking[0].kwh : 0;
    $('r-rank').innerHTML = R.ranking.length ? R.ranking.map(function (r, i) {
      var pct = R.usosTotalKwh ? r.kwh / R.usosTotalKwh * 100 : 0;
      var cor = i === 0 ? 'var(--vermelho)' : i < 3 ? 'var(--amarelo)' : 'var(--ciano)';
      return '<div class="rank"><div class="top"><span>' + (i + 1) + '. ' + r.icone + ' ' + esc(r.nome) + ' <span class="dim">(' + nf(r.min / 60, 1) + ' h)</span></span>' +
        '<span class="num">' + kwh(r.kwh) + ' · ' + brl(r.kwh * t) + '</span></div>' +
        '<div class="barra"><i style="width:' + (max ? r.kwh / max * 100 : 0).toFixed(1) + '%;--c:' + cor + '"></i></div>' +
        '<div class="dim num" style="font-size:11px;margin-top:2px">' + nf(pct, 0) + '% do uso registrado</div></div>';
    }).join('') : '<p class="vazio">Registre usos de aparelhos para ver o ranking.</p>';

    var aviso = R.semMed ? '<p class="alerta">⚠ ' + R.semMed + ' uso(s) de aparelhos sem medidor definido não entram no cálculo de fundo. Defina o medidor no cadastro do aparelho.</p>' : '';
    $('r-int').innerHTML = aviso + (R.grupos.length ? R.grupos.map(function (g) {
      var cab = '<div class="grupo-med"><h3>📟 ' + esc(g.nome) + (g.mult !== 1 ? ' (×' + nf(g.mult, 2) + ')' : '') + '</h3>' +
        '<div class="dim num" style="font-size:12px">' + g.n + ' leituras · total ' + kwh(g.total) + ' · ' + brl(g.total * t) + '</div>';
      if (g.id === DESCONHECIDO) cab += '<p class="alerta">Leituras antigas sem medidor (havia mais de um medidor na migração).</p>';
      if (!g.intervalos.length) return cab + '<p class="vazio">Precisa de ao menos duas leituras deste medidor.</p></div>';
      return cab + g.intervalos.slice().reverse().map(function (x) {
        var fcls = x.fundo >= 0 ? 'pos' : 'neg', alerta = '';
        if (x.medido < 0) alerta = '⚠ Leitura menor que a anterior — erro de digitação ou troca de medidor.';
        else if (x.fundo < 0) alerta = '⚠ Usos registrados superam o medido — potência, minutos ou horário errados.';
        return '<div class="intervalo"><div class="per">' + dt(x.de) + ' → ' + dt(x.ate) + ' <span class="dim">(' + nf(x.horas, 1) + ' h)</span></div>' +
          '<table class="tab">' +
          '<tr><td>Medido no relógio</td><td class="n">' + kwh(x.medido) + '</td><td class="n">' + brl(x.medido * t) + '</td></tr>' +
          '<tr><td>Estimado (' + x.nUsos + ' usos)</td><td class="n">' + kwh(x.estimado) + '</td><td class="n">' + brl(x.estimado * t) + '</td></tr>' +
          '<tr><td class="' + fcls + '">Fundo</td><td class="n ' + fcls + '">' + kwh(x.fundo) + '</td><td class="n ' + fcls + '">' + brl(x.fundo * t) + '</td></tr>' +
          (x.horas > 0 && x.fundo >= 0 ? '<tr><td class="dim">Fundo médio</td><td class="n dim" colspan="2">≈ ' + nf(x.wFundo, 0) + ' W contínuos</td></tr>' : '') +
          '</table>' + (alerta ? '<div class="alerta">' + alerta + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('') : '<p class="vazio">Registre ao menos duas leituras do medidor.</p>');
  }

  // ───────── calendário ─────────
  var hoje0 = new Date();
  var cal = { ano: hoje0.getFullYear(), mes: hoje0.getMonth(), sel: null };
  function porDia(arr) {
    var m = {};
    arr.forEach(function (x) { var k = diaKey(x.ts); (m[k] = m[k] || []).push(x); });
    return m;
  }
  function renderCalendario() {
    var L = porDia(D.leituras), U = porDia(D.usos), hojeK = diaKey(new Date());
    $('cal-titulo').textContent = MESES[cal.mes].toUpperCase() + ' ' + cal.ano;
    var prim = new Date(cal.ano, cal.mes, 1).getDay(), n = new Date(cal.ano, cal.mes + 1, 0).getDate();
    var h = DIAS.map(function (d) { return '<div class="dow">' + d.toUpperCase() + '</div>'; }).join('');
    for (var i = 0; i < prim; i++) h += '<div class="dia fora" aria-hidden="true"></div>';
    var kwhMes = 0, nL = 0, nU = 0;
    for (var dd = 1; dd <= n; dd++) {
      var k = cal.ano + '-' + p2(cal.mes + 1) + '-' + p2(dd), l = (L[k] || []).length, u = (U[k] || []).length;
      nL += l; nU += u; (U[k] || []).forEach(function (x) { kwhMes += kwhUso(x); });
      h += '<button type="button" class="dia' + (k === hojeK ? ' hoje' : '') + (k === cal.sel ? ' sel' : '') + '" data-dia="' + k + '" aria-label="' + dd + ' — ' + l + ' leituras, ' + u + ' usos">' +
        '<span>' + dd + '</span><span class="marcas">' + (l ? '<i class="m l">' + l + '</i>' : '') + (u ? '<i class="m u">' + u + '</i>' : '') + '</span></button>';
    }
    $('cal').innerHTML = h;
    $('cal-resumo').innerHTML = 'No mês: ' + nL + ' leituras · ' + nU + ' usos · <span class="num">' + kwh(kwhMes) + ' · ' + brl(kwhMes * D.tarifa) + '</span> estimados';
    renderPainelDia();
  }
  function renderPainelDia() {
    var k = cal.sel, box = $('cal-painel');
    if (!k || k.slice(0, 7) !== cal.ano + '-' + p2(cal.mes + 1)) { box.innerHTML = ''; return; }
    var L = ord(D.leituras.filter(function (x) { return diaKey(x.ts) === k; }));
    var U = ord(D.usos.filter(function (x) { return diaKey(x.ts) === k; }));
    var tot = U.reduce(function (s, u) { return s + kwhUso(u); }, 0);
    var p = k.split('-'), titulo = DIAS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()] + ', ' + p[2] + '/' + p[1] + '/' + p[0];
    box.innerHTML = '<div class="painel"><div class="painel-top"><h3>' + titulo + '</h3><button type="button" class="x" id="cal-fechar" aria-label="Fechar">✕</button></div>' +
      '<h3>LEITURAS</h3>' + (L.length ? '<ul class="lista">' + L.map(function (l) {
        return '<li><span class="ic">⚡</span><span class="info"><b class="num">' + nf(l.kwh, 1) + ' kWh</b><small>' + esc(nomeMed(l.medidorId)) + ' · ' + hora(l.ts) + '</small></span></li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhuma leitura.</p>') +
      '<h3>USOS</h3>' + (U.length ? '<ul class="lista">' + U.map(function (u) { return linhaUso(u, true); }).join('') + '</ul>' : '<p class="vazio">Nenhum uso.</p>') +
      '<div class="total-box"><span>Total estimado do dia</span><b>' + kwh(tot) + ' · ' + brl(tot * D.tarifa) + '</b></div></div>';
  }
  $('cal').onclick = function (e) {
    var b = e.target.closest('button.dia'); if (!b) return;
    cal.sel = cal.sel === b.dataset.dia ? null : b.dataset.dia;
    renderCalendario();
    if (cal.sel) $('cal-painel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  $('cal-painel').onclick = function (e) { if (e.target.id === 'cal-fechar') { cal.sel = null; renderCalendario(); } };
  function mudaMes(d) { cal.mes += d; if (cal.mes < 0) { cal.mes = 11; cal.ano--; } if (cal.mes > 11) { cal.mes = 0; cal.ano++; } renderCalendario(); }
  $('cal-ant').onclick = function () { mudaMes(-1); };
  $('cal-prox').onclick = function () { mudaMes(1); };

  // ───────── pesquisa ─────────
  function renderFiltros() {
    var sa = $('p-ap'), atual = sa.value;
    sa.innerHTML = '<option value="">Todos</option>' + D.aparelhos.map(function (a) { return '<option value="' + a.id + '">' + a.icone + ' ' + esc(a.nome) + '</option>'; }).join('');
    if (atual && aparelho(atual)) sa.value = atual;
    opcoesMedidores($('p-med'), '<option value="">Todos</option>');
  }
  function pesquisar() {
    var ini = $('p-ini').value, fim = $('p-fim').value, ap = $('p-ap').value, md = $('p-med').value;
    if (ini && fim && ini > fim) { toast('DATA INICIAL APÓS A FINAL'); return; }
    var noPeriodo = function (x) { var k = diaKey(x.ts); return (!ini || k >= ini) && (!fim || k <= fim); };
    var L = ord(D.leituras.filter(function (l) { return noPeriodo(l) && (!md || l.medidorId === md); }));
    var U = ord(D.usos.filter(function (u) { return noPeriodo(u) && (!ap || u.aparelhoId === ap) && (!md || medDoUso(u) === md); }));
    var tot = U.reduce(function (s, u) { return s + kwhUso(u); }, 0), t = D.tarifa;
    // consumo medido no período: última − primeira leitura de cada medidor dentro do filtro
    var porMed = {};
    L.forEach(function (l) { (porMed[l.medidorId] = porMed[l.medidorId] || []).push(l); });
    var medido = Object.keys(porMed).filter(function (id) { return porMed[id].length > 1; }).map(function (id) {
      var a = porMed[id], m = medidor(id);
      return { nome: nomeMed(id), kwh: (a[a.length - 1].kwh - a[0].kwh) * (m ? m.mult : 1) };
    });
    var filtro = (ini ? dataBr(ini) : 'início') + ' → ' + (fim ? dataBr(fim) : 'hoje') +
      (ap ? ' · ' + esc(aparelho(ap).nome) : '') + (md ? ' · ' + esc(nomeMed(md)) : '');
    $('p-res').hidden = false;
    document.body.classList.add('tem-pesquisa');
    $('p-res').innerHTML = '<h2>RESULTADOS</h2><p class="dim" style="font-size:12px">' + filtro + '</p>' +
      '<h3>LEITURAS (' + L.length + ')</h3>' + (L.length ? '<div class="rolagem"><table class="tabela"><thead><tr><th>DATA/HORA</th><th>MEDIDOR</th><th class="n">KWH</th></tr></thead><tbody>' +
        L.map(function (l) { return '<tr><td class="num">' + dt(l.ts) + '</td><td>' + esc(nomeMed(l.medidorId)) + '</td><td class="n">' + nf(l.kwh, 1) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<p class="vazio">Nenhuma leitura.</p>') +
      (medido.length ? medido.map(function (m) { return '<div class="total-box"><span>Medido · ' + esc(m.nome) + '</span><b>' + kwh(m.kwh) + ' · ' + brl(m.kwh * t) + '</b></div>'; }).join('') : '') +
      '<h3>USOS (' + U.length + ')</h3>' + (U.length ? '<div class="rolagem"><table class="tabela larga"><thead><tr><th>DATA/HORA</th><th>APARELHO</th><th>POTÊNCIA</th><th class="n">MIN</th><th class="n">KWH</th><th class="n">CUSTO</th></tr></thead><tbody>' +
        U.map(function (u) {
          var k = kwhUso(u);
          return '<tr><td class="num">' + dt(u.ts) + '</td><td>' + u.icone + ' ' + esc(u.nome) + '</td><td>' + esc(potTxt(u)) + '</td><td class="n">' + nf(u.minutos, 0) +
            '</td><td class="n">' + nf(k, 3) + '</td><td class="n">' + brl(k * t) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="vazio">Nenhum uso.</p>') +
      '<div class="total-box"><span>Total dos usos no período</span><b>' + kwh(tot) + ' · ' + brl(tot * t) + '</b></div>';
  }
  function dataBr(k) { var p = k.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  $('f-pesq').onsubmit = function (e) { e.preventDefault(); pesquisar(); };
  $('p-limpar').onclick = function () {
    $('p-ini').value = $('p-fim').value = ''; $('p-ap').value = ''; $('p-med').value = '';
    $('p-res').hidden = true; $('p-res').innerHTML = ''; document.body.classList.remove('tem-pesquisa');
  };

  // ───────── navegação ─────────
  var abaAtual = 'medidor';
  function irPara(aba) {
    abaAtual = aba;
    document.querySelectorAll('nav button').forEach(function (x) { x.classList.toggle('on', x.dataset.aba === aba); });
    document.querySelectorAll('.aba').forEach(function (s) { s.classList.toggle('on', s.id === 'aba-' + aba); });
    if (aba === 'relatorio') renderRelatorio();
    if (aba === 'calendario') renderCalendario();
    try { sessionStorage.setItem('ve_aba', aba); } catch (er) {}
    window.scrollTo(0, 0);
  }
  $('nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-aba]'); if (b) irPara(b.dataset.aba); });

  function menu(abrir) {
    $('menu').classList.toggle('on', abrir);
    $('btn-menu').setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }
  $('btn-menu').onclick = function (e) { e.stopPropagation(); menu(!$('menu').classList.contains('on')); };
  document.addEventListener('click', function (e) { if (!e.target.closest('#menu')) menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  $('menu').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]'); if (b) { menu(false); irPara(b.dataset.ir); }
  });
  function exportarPdf() {
    menu(false);
    renderRelatorio(); renderCalendario();
    $('print-cab').textContent = 'Gerado em ' + dt(new Date().toISOString()) + ' · Tarifa ' + brl(D.tarifa) + '/kWh · v' + VERSAO + ' · ' + sessao.email;
    window.print();
  }
  $('m-pdf').onclick = exportarPdf;
  $('c-pdf').onclick = exportarPdf;
  function sair() { VigiaAuth.sair(); location.href = '../index.html'; }
  $('m-sair').onclick = sair;

  // ───────── formulários ─────────
  $('l-med').onchange = atualizaPrevLeitura;
  $('f-leitura').onsubmit = function (e) {
    e.preventDefault();
    var mid = medLeituraAtual();
    if (!mid) return toast('ESCOLHA O MEDIDOR');
    var v = numero($('l-kwh').value);
    if (!(v >= 0)) return toast('VALOR INVÁLIDO');
    var ts = lerTs($('l-ts'));
    var antes = ord(D.leituras).filter(function (l) { return l.medidorId === mid && l.ts <= ts; }).pop();
    if (antes && v < antes.kwh && !confirm('Valor menor que a leitura anterior deste medidor (' + nf(antes.kwh, 1) + ' kWh). Registrar mesmo assim?')) return;
    if (antes && v - antes.kwh > 500 && !confirm('Salto de ' + nf(v - antes.kwh, 0) + ' kWh desde a última leitura. Confirma?')) return;
    D.leituras.push({ id: novoId(), ts: ts, kwh: v, medidorId: mid }); salvar();
    $('l-kwh').value = ''; $('l-ts').value = '';
    render(); toast('LEITURA REGISTRADA ✓');
  };

  $('f-medidor').onsubmit = function (e) {
    e.preventDefault();
    var nome = $('m-nome').value.trim(), mult = numero($('m-mult').value);
    if (!nome) return toast('INFORME O NÚMERO/ID');
    if (!(mult > 0 && mult <= 10000)) return toast('MULTIPLICADOR INVÁLIDO');
    if (D.medidores.some(function (m) { return m.nome.toLowerCase() === nome.toLowerCase(); })) return toast('MEDIDOR JÁ CADASTRADO');
    D.medidores.push({ id: novoId(), nome: nome, mult: mult, distribuidora: $('m-dist').value }); salvar();
    $('m-nome').value = ''; $('m-mult').value = '1'; $('m-dist').value = '';
    render(); toast('MEDIDOR ADICIONADO ✓');
  };

  // aparelho: campos de múltiplas potências
  $('a-pots').innerHTML = [1, 2, 3, 4].map(function (i) {
    return '<div class="pot-linha"><input placeholder="Posição ' + i + '" maxlength="40" aria-label="Rótulo ' + i + '"><input class="num" inputmode="numeric" placeholder="W" aria-label="Potência ' + i + ' em watts"></div>';
  }).join('');
  function ajustaCadastro() {
    var lamp = $('a-lamp').checked, multi = $('a-multi').checked;
    $('a-toggle-multi').hidden = lamp;
    $('a-uma').hidden = lamp || multi; $('a-varias').hidden = lamp || !multi;
  }
  $('a-multi').onchange = ajustaCadastro; $('a-lamp').onchange = ajustaCadastro;

  var iconeSel = ICONES[0];
  $('a-icones').innerHTML = ICONES.map(function (i) { return '<button type="button" data-ic="' + i + '">' + i + '</button>'; }).join('');
  function marcarIcone() { document.querySelectorAll('#a-icones button').forEach(function (b) { b.classList.toggle('on', b.dataset.ic === iconeSel); }); }
  $('a-icones').onclick = function (e) { var b = e.target.closest('button'); if (b) { iconeSel = b.dataset.ic; marcarIcone(); } };
  marcarIcone();

  $('f-aparelho').onsubmit = function (e) {
    e.preventDefault();
    var nome = $('a-nome').value.trim();
    if (!nome) return toast('INFORME O NOME');
    var pots = [], lamp = $('a-lamp').checked;
    if (lamp) {
      pots.push({ rotulo: 'Por lâmpada', watts: 9 });
    } else if ($('a-multi').checked) {
      var linhas = document.querySelectorAll('#a-pots .pot-linha');
      for (var i = 0; i < linhas.length; i++) {
        var ins = linhas[i].querySelectorAll('input'), wTxt = ins[1].value.trim();
        if (wTxt === '') continue;
        var w = numero(wTxt);
        if (!(w >= 0 && w <= 50000)) return toast('POTÊNCIA ' + (i + 1) + ' INVÁLIDA');
        pots.push({ rotulo: ins[0].value.trim() || 'Posição ' + (i + 1), watts: w });
      }
      if (pots.length < 2) return toast('PREENCHA AO MENOS 2 POTÊNCIAS');
    } else {
      var w1 = numero($('a-watts').value);
      if (!(w1 > 0 && w1 <= 50000)) return toast('POTÊNCIA INVÁLIDA (1–50000 W)');
      pots.push({ rotulo: 'Normal', watts: w1 });
    }
    D.aparelhos.push({ id: novoId(), nome: nome, icone: iconeSel, potencias: pots, tipo: lamp ? 'lampadas' : '', obs: $('a-obs').value.trim() || (lamp ? OBS_LED : ''),
      medidorId: D.medidores.length > 1 ? $('a-med').value : '' });
    salvar();
    $('a-nome').value = $('a-watts').value = $('a-obs').value = '';
    document.querySelectorAll('#a-pots input').forEach(function (x) { x.value = ''; });
    $('a-multi').checked = false; $('a-lamp').checked = false; ajustaCadastro();
    render(); toast('APARELHO CADASTRADO ✓');
  };

  $('a-lista').addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-ap-med]'); if (!sel) return;
    var a = aparelho(sel.dataset.apMed); if (!a) return;
    a.medidorId = sel.value; salvar(); toast('MEDIDOR DO APARELHO ATUALIZADO ✓');
  });

  $('lamp-w').innerHTML = LAMP_W.map(function (w) { return '<option value="' + w + '">' + w + ' W</option>'; }).join('');
  $('u-lamps').addEventListener('input', previewUso);
  $('u-lamps').addEventListener('click', function (e) {
    var b = e.target.closest('.lamp-del'); if (!b) return;
    e.stopPropagation();
    if (document.querySelectorAll('#u-lamps .lamp-linha').length > 1) b.parentNode.remove();
    else b.parentNode.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    previewUso();
  });
  $('u-lamp-add').onclick = function () {
    if (document.querySelectorAll('#u-lamps .lamp-linha').length >= MAX_LAMP_LINHAS) return toast('MÁXIMO ' + MAX_LAMP_LINHAS + ' TIPOS');
    $('u-lamps').insertAdjacentHTML('beforeend', linhaLamp('', '')); previewUso();
  };

  $('u-ap').onchange = atualizaPotencias;
  $('u-pot').onchange = previewUso; $('u-min').oninput = previewUso; $('u-qtd').oninput = previewUso;
  $('f-uso').onsubmit = function (e) {
    e.preventDefault();
    var f = usoDoForm();
    if (!f) return toast('CADASTRE UM APARELHO');
    if (!(f.m > 0 && f.m <= 1440 * 31)) return toast('MINUTOS INVÁLIDOS');
    if (!(f.q >= 1 && f.q <= 500 && f.q === Math.floor(f.q))) return toast('QUANTIDADE INVÁLIDA');
    if (f.lampadas === null) return toast('CONFIRA AS LÂMPADAS');
    if (f.lampadas && !f.lampadas.length) return toast('INFORME AS LÂMPADAS');
    // guarda nome/potência/ícone no registro: excluir o aparelho não apaga o histórico
    D.usos.push({ id: novoId(), ts: lerTs($('u-ts')), aparelhoId: f.a.id, nome: f.a.nome, icone: f.a.icone,
      watts: f.p.watts, potRotulo: f.lampadas ? f.p.rotulo : f.a.potencias.length > 1 ? f.p.rotulo : '', minutos: f.m, qtd: f.q,
      lampadas: f.lampadas || undefined, medidorId: f.a.medidorId || '' });
    salvar(); $('u-min').value = ''; $('u-qtd').value = '1'; $('u-ts').value = ''; $('u-lamps').dataset.ap = '';
    render(); toast('USO REGISTRADO ✓');
  };

  document.body.addEventListener('click', function (e) {
    var b = e.target.closest('button.x'); if (!b || b.id === 'cal-fechar') return;
    var d = b.dataset;
    if (d.delL && confirm('Excluir esta leitura?')) D.leituras = D.leituras.filter(function (x) { return x.id !== d.delL; });
    else if (d.delA && confirm('Excluir este aparelho? O histórico de uso dele é mantido.')) D.aparelhos = D.aparelhos.filter(function (x) { return x.id !== d.delA; });
    else if (d.delU && confirm('Excluir este registro de uso?')) D.usos = D.usos.filter(function (x) { return x.id !== d.delU; });
    else if (d.delM) {
      var n = D.leituras.filter(function (l) { return l.medidorId === d.delM; }).length;
      if (!confirm('Excluir este medidor?' + (n ? ' As ' + n + ' leituras dele são mantidas como "Medidor removido".' : '') +
        (D.medidores.length === 1 ? '\n\nÉ o único medidor: o app vai pedir o cadastro inicial de novo.' : ''))) return;
      D.medidores = D.medidores.filter(function (x) { return x.id !== d.delM; });
    } else return;
    salvar(); render();
  });

  $('f-tarifa').onsubmit = function (e) {
    e.preventDefault();
    var t = numero($('c-tarifa').value);
    if (!(t > 0 && t < 20)) return toast('TARIFA INVÁLIDA');
    D.tarifa = t; salvar(); render(); toast('TARIFA SALVA ✓');
  };

  $('c-exp').onclick = function () {
    var blob = new Blob([JSON.stringify({ app: 'vigia-energy', versaoApp: VERSAO, exportado: new Date().toISOString(), dados: D }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'vigia-energy-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };
  $('c-imp').onclick = function () { $('c-arq').click(); };
  $('c-arq').onchange = function () {
    var f = this.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var j = JSON.parse(txt), d = j && j.dados;
      if (!d || !Array.isArray(d.leituras) || !Array.isArray(d.aparelhos) || !Array.isArray(d.usos)) throw new Error('formato');
      if (!confirm('Substituir os dados atuais pelo backup (' + d.leituras.length + ' leituras, ' + d.usos.length + ' usos)?')) return;
      d.seeded = true; // backup é a verdade: não pré-cadastra por cima
      D = migrar(d); salvar(); render(); toast('BACKUP IMPORTADO ✓');
    }).catch(function () { toast('ARQUIVO INVÁLIDO'); });
    this.value = '';
  };

  $('c-limpar').onclick = function () {
    if (!confirm('Apagar TODOS os medidores, leituras, aparelhos e usos desta conta? Não dá para desfazer.')) return;
    if (prompt('Digite APAGAR para confirmar') !== 'APAGAR') return toast('CANCELADO');
    localStorage.removeItem(CHAVE); // só a chave deste app/conta — nunca localStorage.clear()
    D = migrar(vazio()); salvar(); render(); // sem medidor → abre o onboarding
  };

  // Redefinir: apaga TODAS as chaves do Vigia Energy (todas as contas) neste aparelho.
  // NÃO usa localStorage.clear(): a origem github.io é compartilhada com o Vigia
  // Financeiro e o Auto-Vigia, e clear() apagaria os dados deles também.
  $('c-reset').onclick = function () {
    if (!confirm('Isso apaga TODOS os dados do Vigia Energy neste aparelho (todas as contas). Tem certeza?')) return;
    var ks = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('ve_') === 0) ks.push(k); }
    ks.forEach(function (k) { localStorage.removeItem(k); });
    try { sessionStorage.removeItem('ve_aba'); } catch (er) {}
    location.reload();
  };

  // preenche o datetime com "agora" quando o usuário abre o ajuste
  document.querySelectorAll('details').forEach(function (d) {
    d.addEventListener('toggle', function () { var i = d.querySelector('input[type=datetime-local]'); if (d.open && i && !i.value) i.value = agoraLocal(); });
  });


  // ═════════ ONBOARDING (4 passos; bloqueia o app até concluir) ═════════
  function precisaOnboarding() { return !D.onboarding || !D.medidores.length; }
  var onb = null, onbRelogio = null;
  var onbValida = {
    1: function () {
      if (!$('o-codigo').value.trim()) return 'Informe o número do medidor.';
      if (!$('o-dist').value) return 'Selecione a distribuidora.';
      var m = $('o-mult').value.trim() === '' ? 1 : numero($('o-mult').value);
      if (!(m > 0 && m <= 10000)) return 'Multiplicador inválido.';
      return '';
    },
    2: function () { return numero($('o-leitura').value) >= 0 ? '' : 'Digite a leitura do display (só números).'; },
    3: function () { return onb.aps.some(function (x) { return x.on; }) ? '' : 'Mantenha pelo menos 1 aparelho marcado.'; },
    4: function () { var t = numero($('o-tarifa').value); return t > 0 && t < 20 ? '' : 'Informe o valor do kWh (ex: 1,10).'; }
  };
  function mostrarOnboarding() {
    document.body.classList.add('onb-on');
    $('onb').hidden = false;
    if (onb) return; // já aberto: não reinicia o que foi digitado
    var base = D.aparelhos.length ? D.aparelhos : seeds();
    onb = { passo: 1, ts: null, aps: base.map(function (a) { return { ap: a, on: true }; }) };
    $('o-codigo').value = ''; $('o-dist').value = ''; $('o-mult').value = '1';
    $('o-leitura').value = ''; $('o-tarifa').value = D.tarifa && D.tarifa !== 1 ? nf(D.tarifa, 2) : '';
    renderOnbAps(); irPasso(1);
    clearInterval(onbRelogio);
    onbRelogio = setInterval(function () { if (onb && onb.passo === 2) $('o-agora').textContent = agoraTxt(); }, 1000);
  }
  function fecharOnboarding() {
    if (!onb && $('onb').hidden) return;
    onb = null; clearInterval(onbRelogio);
    $('onb').hidden = true; document.body.classList.remove('onb-on');
  }
  function agoraTxt() { var d = new Date(); return DIAS[d.getDay()] + ', ' + d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR'); }
  function potResumo(a) {
    if (ehLamp(a)) return 'lâmpadas: qtd. × W';
    return a.potencias.length > 1 ? 'múltiplas potências (' + faixaW(a) + ')' : nf(a.potencias[0].watts, 0) + ' W';
  }
  function renderOnbAps() {
    $('o-aps').innerHTML = onb.aps.length ? onb.aps.map(function (x, i) {
      return '<li data-i="' + i + '" class="' + (x.on ? '' : 'off') + '"><input type="checkbox" ' + (x.on ? 'checked' : '') + ' aria-label="Tenho ' + esc(x.ap.nome) + '">' +
        '<span class="ic">' + x.ap.icone + '</span><span class="info"><b>' + esc(x.ap.nome) + '</b><small class="num">' + esc(potResumo(x.ap)) + '</small></span>' +
        '<button type="button" class="x o-rem" aria-label="Remover da lista">✕</button></li>';
    }).join('') : '<li class="vazio">Lista vazia — adicione ao menos um aparelho abaixo.</li>';
    atualizaOnb();
  }
  function irPasso(n) {
    onb.passo = n;
    $('onb-trilho').style.transform = 'translateX(' + (-(n - 1) * 25) + '%)';
    $('onb-passo').textContent = 'PASSO ' + n + ' DE 4';
    document.querySelectorAll('.onb-barra i').forEach(function (b, i) { b.classList.toggle('on', i < n); });
    document.querySelectorAll('.onb-tela').forEach(function (t) { t.setAttribute('aria-hidden', t.dataset.passo == n ? 'false' : 'true'); t.inert = t.dataset.passo != n; });
    $('onb-voltar').style.visibility = n === 1 ? 'hidden' : 'visible';
    $('onb-prox').textContent = n === 4 ? '✓ COMEÇAR A USAR O VIGIA ENERGY' : 'PRÓXIMO →';
    if (n === 2) $('o-agora').textContent = agoraTxt();
    if (n === 4) { var d = $('o-dist').value; $('o-dist-txt').textContent = d || '—'; }
    $('onb-erro').textContent = '';
    atualizaOnb();
    var tela = document.querySelector('.onb-tela[data-passo="' + n + '"]');
    tela.scrollTop = 0;
    setTimeout(function () { var i = tela.querySelector('[data-obrig]'); if (i && !i.value) i.focus({ preventScroll: true }); }, 280);
  }
  function atualizaOnb() {
    if (!onb) return;
    var msg = onbValida[onb.passo]();
    $('onb-prox').classList.toggle('desab', !!msg);
    $('onb-prox').setAttribute('aria-disabled', msg ? 'true' : 'false');
    $('onb-prox').title = msg;
  }
  $('onb').addEventListener('input', atualizaOnb);
  $('onb').addEventListener('change', atualizaOnb);
  $('onb').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox])')) {
      e.preventDefault();
      if (e.target.id === 'o-ap-nome' || e.target.id === 'o-ap-w') $('o-ap-add').click(); else $('onb-prox').click();
    }
  });
  $('o-aps').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-i]'); if (!li) return;
    var i = Number(li.dataset.i);
    if (e.target.closest('.o-rem')) { e.stopPropagation(); onb.aps.splice(i, 1); }
    else onb.aps[i].on = !onb.aps[i].on;
    renderOnbAps();
  });
  $('o-ap-add').onclick = function () {
    var nome = $('o-ap-nome').value.trim(), w = numero($('o-ap-w').value);
    if (!nome) { $('onb-erro').textContent = 'Informe o nome do aparelho.'; return; }
    if (!(w > 0 && w <= 50000)) { $('onb-erro').textContent = 'Potência inválida (1 a 50000 W).'; return; }
    onb.aps.push({ on: true, ap: { id: novoId(), nome: nome, icone: '🔌', obs: '', medidorId: '', tipo: '', potencias: [{ rotulo: 'Normal', watts: w }] } });
    $('o-ap-nome').value = ''; $('o-ap-w').value = ''; $('onb-erro').textContent = '';
    renderOnbAps();
    $('o-aps').lastElementChild.scrollIntoView({ block: 'nearest' });
  };
  $('onb-voltar').onclick = function () { if (onb && onb.passo > 1) irPasso(onb.passo - 1); };
  $('onb-prox').onclick = function () {
    if (!onb) return;
    var msg = onbValida[onb.passo]();
    if (msg) { $('onb-erro').textContent = msg; return; }
    if (onb.passo === 2) onb.ts = new Date().toISOString(); // momento em que confirmou a leitura
    if (onb.passo < 4) { irPasso(onb.passo + 1); return; }
    concluirOnboarding();
  };
  $('o-imp').onclick = function () { $('c-arq').click(); };

  function concluirOnboarding() {
    var codigo = $('o-codigo').value.trim(), dist = $('o-dist').value;
    var mult = $('o-mult').value.trim() === '' ? 1 : numero($('o-mult').value);
    var m = { id: novoId(), nome: dist && dist !== 'Outra' ? dist + ' ' + codigo : codigo, codigo: codigo, distribuidora: dist, mult: mult };
    // só grava no final (nada é salvo se o usuário sair no meio)
    D.medidores.push(m);
    D.leituras.push({ id: novoId(), ts: onb.ts || new Date().toISOString(), kwh: numero($('o-leitura').value), medidorId: m.id });
    D.aparelhos = onb.aps.filter(function (x) { return x.on; }).map(function (x) { return x.ap; });
    D.seeded = true;
    D.tarifa = numero($('o-tarifa').value);
    D.onboarding = true;
    salvar();
    render(); irPara('medidor');
    toast('TUDO PRONTO ✓');
  }

  // versão
  $('ver').textContent = 'v' + VERSAO;
  $('c-novidades').innerHTML = 'Versão instalada: <b>' + VERSAO + '</b>' + (self.VE_NOVIDADES || []).map(function (n) {
    return '<div style="margin-top:8px"><b>v' + n.v + '</b><ul>' + n.itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
  }).join('');

  render();
  try { var aba = sessionStorage.getItem('ve_aba'); if (aba && $('aba-' + aba)) irPara(aba); } catch (er) {}

  if ('serviceWorker' in navigator) {
    var tinhaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('../sw.js', { scope: '../', updateViaCache: 'none' }).catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (tinhaControle) toast('NOVA VERSÃO INSTALADA — FECHE E ABRA O APP');
    });
  }
  window.__ve = { calcular: calcular, dados: function () { return D; } }; // para testes
})();
