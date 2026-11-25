/* Vigia Energy — autenticação.
 *
 * Login principal: Firebase Auth do projeto Vigia (mesmas contas do Vigia Financeiro:
 * e-mail/senha ou Google), via nuvem.js carregado sob demanda.
 *
 * Cópia local (PBKDF2) da senha: serve só para DESTRAVAR o app sem internet,
 * em aparelhos onde a pessoa já entrou online. Os dados de energia ficam por conta
 * em `ve_data_<uid local>` (uid local = hash do e-mail, igual em todo aparelho).
 *
 * Mesma origem dos outros Vigias (github.io): só chaves `ve_`, nunca localStorage.clear().
 */
(function (g) {
  'use strict';
  var K_USERS = 've_auth_users', K_SESSION = 've_session';
  var BASE = (document.currentScript && document.currentScript.src) || location.href;

  function ler(k, padrao) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; }
    catch (e) { return padrao; }
  }
  function gravar(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function comTempo(p, ms, msg) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg)); }, ms); })]);
  }

  async function derivar(senha, saltHex) {
    var enc = new TextEncoder();
    var salt = new Uint8Array(saltHex.match(/../g).map(function (h) { return parseInt(h, 16); }));
    var chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, chave, 256);
    return hex(bits);
  }
  async function uid(email) {
    var d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ve:' + email));
    return hex(d).slice(0, 16);
  }

  var nuvemP = null;
  var Auth = {
    disponivel: function () { return !!(g.crypto && crypto.subtle); },
    normEmail: normEmail,

    /** Promise do módulo nuvem.js (Firebase). Rejeita sem internet — o app segue local. */
    nuvemConfigurada: function () { var c = g.VE_FIREBASE_CONFIG; return !!(c && c.apiKey); },
    nuvem: function () {
      if (!this.nuvemConfigurada()) return Promise.reject(Object.assign(new Error('Nuvem não configurada.'), { code: 'sem-config' }));
      if (!nuvemP) {
        nuvemP = comTempo(import(new URL('nuvem.js', BASE).href), 12000, 'Sem conexão com a nuvem.')
          .catch(function (e) { nuvemP = null; throw e; });
      }
      return nuvemP;
    },

    /** Guarda/atualiza a verificação local da senha (para destravar offline). */
    async lembrar(email, senha) {
      email = normEmail(email);
      var users = ler(K_USERS, {}), s = new Uint8Array(16); crypto.getRandomValues(s);
      var salt = hex(s), antigo = users[email] || {};
      users[email] = { salt: salt, hash: await derivar(senha, salt), uid: await uid(email), criado: antigo.criado || new Date().toISOString() };
      gravar(K_USERS, users);
    },
    temContaLocal: function (email) { return !!ler(K_USERS, {})[normEmail(email)]; },
    async verificarLocal(email, senha) {
      var u = ler(K_USERS, {})[normEmail(email)];
      return !!u && (await derivar(senha, u.salt)) === u.hash;
    },
    /** Entrada pela senha guardada neste aparelho (sem internet, ou nuvem desligada). */
    async entrarLocal(email, senha) {
      if (!(await this.verificarLocal(email, senha))) {
        throw new Error(this.temContaLocal(email) || !this.nuvemConfigurada() ? 'E-mail ou senha incorretos.'
          : 'Sem internet. No primeiro acesso neste aparelho é preciso estar online.');
      }
      return this.abrirSessao(email, null);
    },
    /** Conta só neste aparelho (usada enquanto a nuvem estiver desligada). */
    async criarContaLocal(email, senha) {
      email = normEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
      if (this.temContaLocal(email)) throw new Error('Já existe conta com esse e-mail neste aparelho. Use "Entrar".');
      await this.lembrar(email, senha);
      return this.abrirSessao(email, null);
    },
    async abrirSessao(email, fbUid) {
      email = normEmail(email);
      var s = { email: email, uid: await uid(email), fbUid: fbUid || null, desde: new Date().toISOString() };
      gravar(K_SESSION, s); return s;
    },
    sessao: function () { return ler(K_SESSION, null); },
    /** Sai do Energy (sessão local + Firebase do Energy). Não afeta o Vigia Financeiro. */
    sair: function () {
      localStorage.removeItem(K_SESSION);
      if (!this.nuvemConfigurada()) return Promise.resolve();
      return comTempo(this.nuvem().then(function (n) { return n.sair(); }), 4000, 't').catch(function () {});
    }
  };
  g.VigiaAuth = Auth;
})(window);
