/* Vigia Energy — acesso ao Firebase (projeto EXCLUSIVO do Energy, config em firebase-config.js).
 *
 * Carregado sob demanda (import dinâmico) por auth.js: sem rede ou sem config, o import
 * não acontece/falha e o app segue 100% local. Nada aqui bloqueia a abertura do app.
 * App Firebase com nome próprio ('vigia-energy'): a sessão fica numa chave só dele,
 * sem tocar em outros apps Firebase da mesma origem (github.io).
 * Dados em usuarios/{uid}/energia/* — regras no README.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDocs, collection, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = self.VE_FIREBASE_CONFIG;
if (!firebaseConfig || !firebaseConfig.apiKey) throw Object.assign(new Error('Nuvem não configurada.'), { code: 'sem-config' });

const app = initializeApp(firebaseConfig, 'vigia-energy');
const auth = getAuth(app);
const db = getFirestore(app);
const COL = 'energia';

let pronto = null;
/** Usuário do Firebase restaurado da sessão salva (ou null). */
export function usuarioAtual() {
  if (!pronto) pronto = new Promise((res) => { const off = onAuthStateChanged(auth, (u) => { off(); res(u); }); });
  return pronto.then(() => auth.currentUser);
}

const MSG = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-password': 'Informe a senha.',
  'auth/weak-password': 'Senha fraca: use ao menos 6 caracteres.',
  'auth/email-already-in-use': 'Este e-mail já tem conta no Vigia. Use "Entrar".',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/popup-closed-by-user': 'Login com Google cancelado.',
  'auth/cancelled-popup-request': 'Login com Google cancelado.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/unauthorized-domain': 'Domínio não autorizado no Firebase (Authentication → Settings → Authorized domains).',
  'auth/operation-not-allowed': 'Este método de login não está ativado no Firebase.'
};
export function mensagem(e) { return MSG[e && e.code] || (e && e.message) || 'Erro desconhecido.'; }
export function credencialInvalida(e) {
  return /invalid-credential|invalid-login-credentials|user-not-found|wrong-password/.test((e && e.code) || '');
}

export async function entrar(email, senha) { return (await signInWithEmailAndPassword(auth, email, senha)).user; }
export async function criarConta(email, senha) { return (await createUserWithEmailAndPassword(auth, email, senha)).user; }
export function redefinirSenha(email) { return sendPasswordResetEmail(auth, email); }
/* Só popup. O redirect entre github.io e firebaseapp.com é bloqueado pelo isolamento
 * de armazenamento dos navegadores atuais (iOS/Safari, Chrome) e falha EM SILÊNCIO —
 * a pessoa volta para a tela de login sem erro nenhum. */
export async function entrarGoogle() {
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  try { return (await signInWithPopup(auth, prov)).user; }
  catch (e) {
    if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(e.code || '')) {
      throw Object.assign(new Error('O login com Google não abre neste modo. Use e-mail e senha, ou abra o Vigia pelo navegador.'), { code: 'google-indisponivel' });
    }
    throw e;
  }
}
export async function resultadoRedirect() { const r = await getRedirectResult(auth); return r ? r.user : null; }
export function sair() { return signOut(auth); }

/** Todos os documentos de usuarios/{uid}/energia como {id: dados}. */
export async function baixar(uid) {
  const snap = await getDocs(collection(db, 'usuarios', uid, COL));
  const out = {};
  snap.forEach((d) => { out[d.id] = d.data(); });
  return out;
}
/** Grava um documento (o conteúdo vai como JSON em texto: sem pegadinhas de tipos do Firestore). */
export function gravar(uid, id, json) {
  return setDoc(doc(db, 'usuarios', uid, COL, id), { v: 1, json, atualizadoEm: serverTimestamp() });
}
