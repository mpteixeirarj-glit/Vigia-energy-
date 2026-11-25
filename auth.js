/* Vigia — autenticação LOCAL (simulada).
 *
 * Não há backend: contas e sessão ficam no localStorage deste aparelho.
 * Isso NÃO é segurança real — qualquer pessoa com acesso ao navegador
 * consegue ler os dados. Serve só para separar perfis no mesmo aparelho.
 *
 * Atenção: os três Vigias publicados em mpteixeirarj-glit.github.io
 * compartilham a MESMA origem, logo o MESMO localStorage. Por isso todas
 * as chaves daqui usam o prefixo `ve_` e nunca chamamos localStorage.clear().
 */
(function (g) {
  'use strict';
  var K_USERS = 've_auth_users', K_SESSION = 've_session';

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

  var Auth = {
    disponivel: function () { return !!(g.crypto && crypto.subtle); },
    async criarConta(email, senha) {
      email = normEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
      if (String(senha).length < 6) throw new Error('Senha precisa ter ao menos 6 caracteres.');
      var users = ler(K_USERS, {});
      if (users[email]) throw new Error('Já existe conta com esse e-mail neste aparelho.');
      var s = new Uint8Array(16); crypto.getRandomValues(s);
      var salt = hex(s);
      users[email] = { salt: salt, hash: await derivar(senha, salt), uid: await uid(email), criado: new Date().toISOString() };
      gravar(K_USERS, users);
      return this._abrirSessao(email, users[email].uid);
    },
    async entrar(email, senha) {
      email = normEmail(email);
      var u = ler(K_USERS, {})[email];
      // mensagem genérica: não revela se o e-mail existe
      if (!u || (await derivar(senha, u.salt)) !== u.hash) throw new Error('E-mail ou senha incorretos.');
      return this._abrirSessao(email, u.uid);
    },
    _abrirSessao: function (email, id) {
      var s = { email: email, uid: id, desde: new Date().toISOString() };
      gravar(K_SESSION, s); return s;
    },
    sessao: function () { return ler(K_SESSION, null); },
    sair: function () { localStorage.removeItem(K_SESSION); }
  };
  g.VigiaAuth = Auth;
})(window);
