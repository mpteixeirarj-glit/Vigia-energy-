/* Vigia Energy — lógica do app. Dados em localStorage, chave `ve_data_<uid>`. */
(function () {
  'use strict';
  var sessao = VigiaAuth.sessao();
  if (!sessao) return;
  var CHAVE = 've_data_' + sessao.uid;
  var ICONES = ['🚿', '❄️', '📺', '🎮', '🌀', '🍳', '💡', '🧊', '🧺', '🔥', '💻', '🖥️', '☕', '🔌', '🛁', '💇', '🍞', '🔋', '🏊', '⚙️'];
  var $ = function (id) { return document.getElementById(id); };

  // ───────── dados ─────────
  function vazio() { return { versao: 1, tarifa: 1, leituras: [], aparelhos: [], usos: [] }; }
  function carregar() {
    try {
      var d = JSON.parse(localStorage.getItem(CHAVE));
      if (d && Array.isArray(d.leituras)) return Object.assign(vazio(), d);
    } catch (e) {}
    return vazio();
  }
  var D = carregar();
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(D)); }
    catch (e) { toast('ERRO AO SALVAR: armazenamento cheio?'); }
  }
  function novoId() {
    var a = new Uint32Array(2); crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  }

  // ───────── formatação ─────────
  var nf = function (n, c) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }); };
  var kwh = function (n) { return nf(n, Math.abs(n) < 10 ? 3 : 2) + ' kWh'; };
  var brl = function (n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var dt = function (iso) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  function numero(s) {
    // aceita "12.345,6" (pt-BR), "12345,6" e "12345.6"
    s = String(s || '').trim().replace(/\s/g, '');
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
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = 'none'; }, 2600);
  }
  var kwhDe = function (watts, minutos) { return (watts * minutos / 60) / 1000; };
  var ord = function (arr) { return arr.slice().sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; }); };

  // ───────── cálculo do relatório (puro) ─────────
  function calcular(d) {
    var L = ord(d.leituras), U = ord(d.usos), t = d.tarifa;
    var intervalos = [];
    for (var i = 1; i < L.length; i++) {
      var a = L[i - 1], b = L[i];
      // uso pertence ao intervalo pelo horário em que TERMINOU: (a, b]
      var dentro = U.filter(function (u) { return u.ts > a.ts && u.ts <= b.ts; });
      var est = dentro.reduce(function (s, u) { return s + kwhDe(u.watts, u.minutos); }, 0);
      var med = b.kwh - a.kwh;
      var horas = (new Date(b.ts) - new Date(a.ts)) / 36e5;
      intervalos.push({ de: a.ts, ate: b.ts, horas: horas, medido: med, estimado: est, fundo: med - est, nUsos: dentro.length,
        wFundo: horas > 0 ? (med - est) / horas * 1000 : 0 });
    }
    var rank = {};
    U.forEach(function (u) {
      var k = u.aparelhoId;
      if (!rank[k]) rank[k] = { nome: u.nome, icone: u.icone, kwh: 0, min: 0 };
      rank[k].kwh += kwhDe(u.watts, u.minutos); rank[k].min += u.minutos;
    });
    var ranking = Object.keys(rank).map(function (k) { return rank[k]; }).sort(function (x, y) { return y.kwh - x.kwh; });
    var total = L.length > 1 ? L[L.length - 1].kwh - L[0].kwh : 0;
    var dias = L.length > 1 ? (new Date(L[L.length - 1].ts) - new Date(L[0].ts)) / 864e5 : 0;
    var estTotal = intervalos.reduce(function (s, x) { return s + x.estimado; }, 0);
    return { intervalos: intervalos, ranking: ranking, total: total, dias: dias, estTotal: estTotal,
      porDia: dias >= 0.5 ? total / dias : null, tarifa: t, usosTotalKwh: ranking.reduce(function (s, r) { return s + r.kwh; }, 0) };
  }

  // ───────── render ─────────
  function render() {
    renderLeituras(); renderAparelhos(); renderUsos(); renderRelatorio();
    $('c-tarifa').value = nf(D.tarifa, 2);
    $('c-conta').textContent = 'Conta: ' + sessao.email;
  }

  function renderLeituras() {
    var L = ord(D.leituras).reverse();
    $('l-lista').innerHTML = L.length ? L.map(function (l, i) {
      var ant = L[i + 1], dif = ant ? l.kwh - ant.kwh : null;
      return '<li><span class="ic">⚡</span><span class="info"><b class="num">' + nf(l.kwh, 1) + ' kWh</b><small>' + dt(l.ts) +
        (dif !== null ? ' · <span class="' + (dif < 0 ? 'neg' : 'pos') + '">' + (dif >= 0 ? '+' : '') + nf(dif, 2) + '</span>' : '') +
        '</small></span><button class="x" data-del-l="' + l.id + '" aria-label="Excluir">✕</button></li>';
    }).join('') : '<li class="vazio">Nenhuma leitura ainda. Vá até o relógio e anote o número.</li>';
    var ult = L[0];
    $('l-prev').textContent = ult ? 'Última: ' + nf(ult.kwh, 1) + ' kWh em ' + dt(ult.ts) : '';
  }

  function renderAparelhos() {
    var A = D.aparelhos;
    $('a-lista').innerHTML = A.length ? A.map(function (a) {
      return '<li><span class="ic">' + a.icone + '</span><span class="info"><b>' + esc(a.nome) + '</b><small class="num">' + nf(a.watts, 0) +
        ' W · ' + brl(kwhDe(a.watts, 60) * D.tarifa) + '/hora</small></span><button class="x" data-del-a="' + a.id + '" aria-label="Excluir">✕</button></li>';
    }).join('') : '<li class="vazio">Cadastre seus aparelhos. A potência fica na etiqueta.</li>';
    var sel = $('u-ap'), atual = sel.value;
    sel.innerHTML = A.length ? A.map(function (a) { return '<option value="' + a.id + '">' + a.icone + ' ' + esc(a.nome) + ' (' + nf(a.watts, 0) + ' W)</option>'; }).join('')
      : '<option value="">— cadastre um aparelho primeiro —</option>';
    if (atual && A.some(function (a) { return a.id === atual; })) sel.value = atual;
    previewUso();
  }

  function renderUsos() {
    var U = ord(D.usos).reverse().slice(0, 200);
    $('u-lista').innerHTML = U.length ? U.map(function (u) {
      var k = kwhDe(u.watts, u.minutos);
      return '<li><span class="ic">' + u.icone + '</span><span class="info"><b>' + esc(u.nome) + '</b><small><span class="num">' + nf(u.minutos, 0) +
        ' min · ' + kwh(k) + ' · ' + brl(k * D.tarifa) + '</span><br>' + dt(u.ts) + '</small></span><button class="x" data-del-u="' + u.id + '" aria-label="Excluir">✕</button></li>';
    }).join('') : '<li class="vazio">Nenhum uso registrado.</li>';
  }

  function kpi(rot, v, s) { return '<div class="kpi"><div class="r">' + rot + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }

  function renderRelatorio() {
    var R = calcular(D), t = D.tarifa;
    $('print-cab').textContent = 'Gerado em ' + dt(new Date().toISOString()) + ' · Tarifa ' + brl(t) + '/kWh · ' + sessao.email;
    var k = '';
    k += kpi('MEDIDO TOTAL', R.total ? kwh(R.total) : '—', R.total ? brl(R.total * t) : 'precisa de 2 leituras');
    k += kpi('PERÍODO', R.dias ? nf(R.dias, 1) + ' dias' : '—', D.leituras.length + ' leituras');
    k += kpi('MÉDIA/DIA', R.porDia !== null ? kwh(R.porDia) : '—', R.porDia !== null ? brl(R.porDia * t) : '');
    k += kpi('PROJEÇÃO 30 DIAS', R.porDia !== null ? brl(R.porDia * 30 * t) : '—', R.porDia !== null ? kwh(R.porDia * 30) : '');
    $('r-kpis').innerHTML = k + (R.porDia !== null && R.dias < 3 ? '<p class="dim" style="grid-column:1/-1;font-size:12px">Projeção com menos de 3 dias de dados é pouco confiável.</p>' : '');

    var max = R.ranking.length ? R.ranking[0].kwh : 0;
    $('r-rank').innerHTML = R.ranking.length ? R.ranking.map(function (r, i) {
      var pct = R.usosTotalKwh ? r.kwh / R.usosTotalKwh * 100 : 0;
      var cor = i === 0 ? 'var(--vermelho)' : i < 3 ? 'var(--amarelo)' : 'var(--ciano)';
      return '<div class="rank"><div class="top"><span>' + (i + 1) + '. ' + r.icone + ' ' + esc(r.nome) + ' <span class="dim">(' + nf(r.min / 60, 1) + ' h)</span></span>' +
        '<span class="num">' + kwh(r.kwh) + ' · ' + brl(r.kwh * t) + '</span></div>' +
        '<div class="barra"><i style="width:' + (max ? r.kwh / max * 100 : 0).toFixed(1) + '%;--c:' + cor + '"></i></div>' +
        '<div class="dim num" style="font-size:11px;margin-top:2px">' + nf(pct, 0) + '% do uso registrado</div></div>';
    }).join('') : '<p class="vazio">Registre usos de aparelhos para ver o ranking.</p>';

    $('r-int').innerHTML = R.intervalos.length ? R.intervalos.slice().reverse().map(function (x) {
      var fcls = x.fundo >= 0 ? 'pos' : 'neg';
      var alerta = '';
      if (x.medido < 0) alerta = '⚠ Leitura menor que a anterior — erro de digitação ou troca de medidor.';
      else if (x.fundo < 0) alerta = '⚠ Usos registrados superam o medido — potência, minutos ou horário errados.';
      return '<div class="intervalo"><div class="per">' + dt(x.de) + ' → ' + dt(x.ate) + ' <span class="dim">(' + nf(x.horas, 1) + ' h)</span></div>' +
        '<table class="tab">' +
        '<tr><td>Medido no relógio</td><td class="n">' + kwh(x.medido) + '</td><td class="n">' + brl(x.medido * t) + '</td></tr>' +
        '<tr><td>Estimado (' + x.nUsos + ' usos)</td><td class="n">' + kwh(x.estimado) + '</td><td class="n">' + brl(x.estimado * t) + '</td></tr>' +
        '<tr><td class="' + fcls + '">Fundo</td><td class="n ' + fcls + '">' + kwh(x.fundo) + '</td><td class="n ' + fcls + '">' + brl(x.fundo * t) + '</td></tr>' +
        (x.horas > 0 && x.fundo >= 0 ? '<tr><td class="dim">Fundo médio</td><td class="n dim" colspan="2">≈ ' + nf(x.wFundo, 0) + ' W contínuos</td></tr>' : '') +
        '</table>' + (alerta ? '<div class="alerta">' + alerta + '</div>' : '') + '</div>';
    }).join('') : '<p class="vazio">Registre ao menos duas leituras do medidor.</p>';
  }

  function previewUso() {
    var a = D.aparelhos.find(function (x) { return x.id === $('u-ap').value; });
    var m = numero($('u-min').value);
    $('u-prev').innerHTML = a && m > 0 ? '≈ <span class="num">' + kwh(kwhDe(a.watts, m)) + ' · ' + brl(kwhDe(a.watts, m) * D.tarifa) + '</span>' : '';
  }

  // ───────── eventos ─────────
  document.getElementById('nav').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-aba]'); if (!b) return;
    document.querySelectorAll('nav button').forEach(function (x) { x.classList.toggle('on', x === b); });
    document.querySelectorAll('.aba').forEach(function (s) { s.classList.toggle('on', s.id === 'aba-' + b.dataset.aba); });
    if (b.dataset.aba === 'relatorio') renderRelatorio();
    try { sessionStorage.setItem('ve_aba', b.dataset.aba); } catch (er) {}
    window.scrollTo(0, 0);
  });

  $('f-leitura').onsubmit = function (e) {
    e.preventDefault();
    var v = numero($('l-kwh').value);
    if (!(v >= 0)) return toast('VALOR INVÁLIDO');
    var ts = lerTs($('l-ts'));
    var antes = ord(D.leituras).filter(function (l) { return l.ts <= ts; }).pop();
    if (antes && v < antes.kwh && !confirm('Valor menor que a leitura anterior (' + nf(antes.kwh, 1) + ' kWh). Registrar mesmo assim?')) return;
    if (antes && v - antes.kwh > 500 && !confirm('Salto de ' + nf(v - antes.kwh, 0) + ' kWh desde a última leitura. Confirma?')) return;
    D.leituras.push({ id: novoId(), ts: ts, kwh: v }); salvar();
    $('l-kwh').value = ''; $('l-ts').value = '';
    render(); toast('LEITURA REGISTRADA ✓');
  };

  var iconeSel = ICONES[0];
  $('a-icones').innerHTML = ICONES.map(function (i) { return '<button type="button" data-ic="' + i + '">' + i + '</button>'; }).join('');
  function marcarIcone() { document.querySelectorAll('#a-icones button').forEach(function (b) { b.classList.toggle('on', b.dataset.ic === iconeSel); }); }
  $('a-icones').onclick = function (e) { var b = e.target.closest('button'); if (b) { iconeSel = b.dataset.ic; marcarIcone(); } };
  marcarIcone();

  $('f-aparelho').onsubmit = function (e) {
    e.preventDefault();
    var nome = $('a-nome').value.trim(), w = numero($('a-watts').value);
    if (!nome) return toast('INFORME O NOME');
    if (!(w > 0 && w <= 50000)) return toast('POTÊNCIA INVÁLIDA (1–50000 W)');
    D.aparelhos.push({ id: novoId(), nome: nome, watts: w, icone: iconeSel }); salvar();
    $('a-nome').value = ''; $('a-watts').value = '';
    render(); toast('APARELHO CADASTRADO ✓');
  };

  $('u-ap').onchange = previewUso; $('u-min').oninput = previewUso;
  $('f-uso').onsubmit = function (e) {
    e.preventDefault();
    var a = D.aparelhos.find(function (x) { return x.id === $('u-ap').value; });
    var m = numero($('u-min').value);
    if (!a) return toast('CADASTRE UM APARELHO');
    if (!(m > 0 && m <= 1440 * 31)) return toast('MINUTOS INVÁLIDOS');
    // guarda nome/potência/ícone no registro: excluir o aparelho não apaga o histórico
    D.usos.push({ id: novoId(), ts: lerTs($('u-ts')), aparelhoId: a.id, nome: a.nome, watts: a.watts, icone: a.icone, minutos: m });
    salvar(); $('u-min').value = ''; $('u-ts').value = '';
    render(); toast('USO REGISTRADO ✓');
  };

  document.body.addEventListener('click', function (e) {
    var b = e.target.closest('button.x'); if (!b) return;
    if (b.dataset.delL && confirm('Excluir esta leitura?')) D.leituras = D.leituras.filter(function (x) { return x.id !== b.dataset.delL; });
    else if (b.dataset.delA && confirm('Excluir este aparelho? O histórico de uso dele é mantido.')) D.aparelhos = D.aparelhos.filter(function (x) { return x.id !== b.dataset.delA; });
    else if (b.dataset.delU && confirm('Excluir este registro de uso?')) D.usos = D.usos.filter(function (x) { return x.id !== b.dataset.delU; });
    else return;
    salvar(); render();
  });

  $('f-tarifa').onsubmit = function (e) {
    e.preventDefault();
    var t = numero($('c-tarifa').value);
    if (!(t > 0 && t < 20)) return toast('TARIFA INVÁLIDA');
    D.tarifa = t; salvar(); render(); toast('TARIFA SALVA ✓');
  };
  $('c-pdf').onclick = function () { renderRelatorio(); window.print(); };

  $('c-exp').onclick = function () {
    var blob = new Blob([JSON.stringify({ app: 'vigia-energy', exportado: new Date().toISOString(), dados: D }, null, 2)], { type: 'application/json' });
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
      D = Object.assign(vazio(), d); salvar(); render(); toast('BACKUP IMPORTADO ✓');
    }).catch(function () { toast('ARQUIVO INVÁLIDO'); });
    this.value = '';
  };

  $('c-limpar').onclick = function () {
    if (!confirm('Apagar TODAS as leituras, aparelhos e usos desta conta? Não dá para desfazer.')) return;
    if (prompt('Digite APAGAR para confirmar') !== 'APAGAR') return toast('CANCELADO');
    localStorage.removeItem(CHAVE); // só a chave deste app/conta — nunca localStorage.clear()
    D = vazio(); render(); toast('DADOS APAGADOS');
  };
  $('c-sair').onclick = function () { VigiaAuth.sair(); location.href = '../index.html'; };

  // preenche o datetime com "agora" quando o usuário abre o ajuste
  document.querySelectorAll('details').forEach(function (d) {
    d.addEventListener('toggle', function () { var i = d.querySelector('input'); if (d.open && !i.value) i.value = agoraLocal(); });
  });

  render();
  try { var aba = sessionStorage.getItem('ve_aba'); if (aba) { var bt = document.querySelector('nav button[data-aba="' + aba + '"]'); if (bt) bt.click(); } } catch (er) {}

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {});
  window.__veCalcular = calcular; // para testes
})();
