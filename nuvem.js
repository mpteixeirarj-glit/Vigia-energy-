/* Vigia Energy — acesso ao Firebase (projeto do Vigia, compartilhado com o Financeiro).
 *
 * Carregado sob demanda (import dinâmico) por auth.js: se não houver rede, o import
 * falha e o app segue 100% local. Nada aqui bloqueia a abertura do app.
 *
 * Isolamento do Vigia Financeiro (mesma origem github.io, mesmo projeto Firebase):
 *  - app com NOME próprio ('vigia-energy'): a sessão do Firebase Auth fica salva sob
 *    outra chave. Entrar/sair aqui não loga nem desloga o Financeiro, e o login
 *    lembrado do Energy não abre o Financeiro (que usa sessão só da aba, de propósito).
 *  - dados em usuarios/{uid}/energia/* — o Financeiro usa usuarios/{uid}/dados e /config.
 *    As regras atuais (usuarios/{uid}/{documento=**} só para o dono) já cobrem.
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

// Config pública do projeto (a mesma do Vigia Financeiro). Não é segredo:
// o acesso aos dados é controlado pelas regras do Firestore.
const firebaseConfig = {
  apiKey: 'AIzaSyCFCQaU8a96kos470rGh-0yLIQgAv4AiIM',
  authDomain: 'vigia-56137.firebaseapp.com',
  projectId: 'vigia-56137',
  storageBucket: 'vigia-56137.firebasestorage.app',
  messagingSenderId: '112371837401',
  appId: '1:112371837401:web:0dc5905e9217de6a4651c8'
};

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
export async function entrarGoogle() {
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  // no app instalado (standalone) o popup costuma falhar: vai direto de redirect
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone) {
    try { return (await signInWithPopup(auth, prov)).user; }
    catch (e) { if (!/popup-blocked|operation-not-supported/.test(e.code || '')) throw e; }
  }
  await signInWithRedirect(auth, prov);
  return null; // a página recarrega; o resultado vem em resultadoRedirect()
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
