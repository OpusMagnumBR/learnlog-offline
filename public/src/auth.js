// auth.js – email/login + hasło; rejestracja: email + login + hasło
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth, setPersistence,
  indexedDBLocalPersistence, browserSessionPersistence,
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

import {
  getFirestore, doc, setDoc, getDoc // ← [CHANGED] dodany getDoc, usunięte nieużywane query/where/getDocs/collection
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// --- KONFIG FIREBASE ---
const firebaseConfig = {
  apiKey: 'AIzaSyCYy5Py7Q2jptVzggUjyvQMP1clhFOmzzU',
  authDomain: 'learn-optimization.firebaseapp.com',
  projectId: 'learn-optimization',
  appId: '1:465628930006:web:c033a22172d94255c7ce77'
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const $ = (s) => document.querySelector(s);

// rozstrzygamy identyfikator → email (email albo login)
async function resolveEmail(identifier) {
  const id = (identifier || '').trim();
  if (!id) throw new Error('Podaj email lub login.');
  if (id.includes('@')) return id; // wygląda jak email

  // [CHANGED] login → email przez pojedynczy odczyt usernames/<loginLower>
  const loginLower = id.toLowerCase();
  const ref = doc(db, 'usernames', loginLower);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Nie znaleziono użytkownika o takim loginie.');
  const data = snap.data();
  if (!data?.email) throw new Error('Konto nie ma przypisanego emaila.');
  return data.email;
}

window.addEventListener('DOMContentLoaded', async () => {
  await setPersistence(auth, indexedDBLocalPersistence).catch(console.error);

  // ELEMENTY UI
  const titleEl    = $('#auth-title');
  const idEl       = $('#auth-id');        // email LUB login (w rejestracji: email)
  const passEl     = $('#auth-pass');
  const usernameEl = $('#auth-username');  // login (tylko w rejestracji)
  const formEl     = $('#auth-form');
  const btnSignup  = $('#btn-signup');
  const btnReset   = $('#btn-reset');
  const btnLogout  = $('#btn-logout');

  let signupMode = false;

  function enterSignupMode() {
    signupMode = true;
    if (titleEl) titleEl.textContent = 'Załóż konto';
    if (idEl)    idEl.placeholder = 'Email';
    if (usernameEl) usernameEl.style.display = '';
    if (btnSignup) btnSignup.textContent = 'Utwórz konto';
  }
  function leaveSignupMode() {
    signupMode = false;
    if (titleEl) titleEl.textContent = 'Zaloguj się';
    if (idEl)    idEl.placeholder = 'Email lub login';
    if (usernameEl) { usernameEl.style.display = 'none'; usernameEl.value = ''; }
    if (btnSignup) btnSignup.textContent = 'Załóż konto';
  }

  // LOGOWANIE (submit formularza)
  if (formEl && idEl && passEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      // w trybie rejestracji submit NIE loguje — robimy rejestrację z przycisku
      if (signupMode) return;
      try {
        const email = await resolveEmail(idEl.value);
        await signInWithEmailAndPassword(auth, email, passEl.value);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Logowanie nieudane.');
      }
    });
  }

  // REJESTRACJA (przycisk)
  if (btnSignup && idEl && passEl) {
    btnSignup.addEventListener('click', async () => {
      try {
        // 1) jeśli jeszcze nie jesteśmy w trybie rejestracji — tylko przełącz UI
        if (!signupMode) { enterSignupMode(); return; }

        // 2) w trybie rejestracji faktycznie tworzymy konto
        const emailInput = idEl.value.trim();
        const usernameInput = (usernameEl?.value || '').trim();
        if (!emailInput || !emailInput.includes('@')) {
          alert('Podaj poprawny adres email.');
          return;
        }
        if (!usernameInput) {
          alert('Podaj login.');
          return;
        }

        // [CHANGED] unikalność loginu przez usernames/<usernameLower> (bez query)
        const usernameLower = usernameInput.toLowerCase();
        const nameRef = doc(db, 'usernames', usernameLower);
        const nameSnap = await getDoc(nameRef);
        if (nameSnap.exists()) {
          alert('Taki login jest już zajęty. Wybierz inny.');
          return;
        }

        // tworzymy konto
        const cred = await createUserWithEmailAndPassword(auth, emailInput, passEl.value);
        await updateProfile(cred.user, { displayName: usernameInput }).catch(()=>{});

        // zapis profilu
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: emailInput,
          username: usernameInput,
          usernameLower
        });

        // [CHANGED] mapowanie login → email/uid w kolekcji 'usernames' (ID = usernameLower)
        await setDoc(doc(db, 'usernames', usernameLower), {
          uid: cred.user.uid,
          email: emailInput
        });

        alert('Konto utworzone. Jesteś zalogowany.');
        leaveSignupMode();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Rejestracja nieudana.');
      }
    });
  }

  // RESET HASŁA – wymagaj emaila
  if (btnReset && idEl) {
    btnReset.addEventListener('click', async () => {
      try {
        const raw = idEl.value.trim();
        if (!raw || !raw.includes('@')) {
          alert('Reset hasła wymaga adresu e‑mail. Wpisz email w pierwszym polu.');
          return;
        }
        await sendPasswordResetEmail(auth, raw);
        alert('Wysłano link resetu hasła (jeśli email istnieje).');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Nie udało się wysłać resetu hasła.');
      }
    });
  }

  // WYLOGOWANIE (jeśli masz #btn-logout w headerze)
  if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth).catch(console.error));

  // PRZEŁĄCZANIE WIDOKÓW
  const appRoot = document.querySelector('#app-root');
  const authBox = document.querySelector('#auth-box');
  onAuthStateChanged(auth, (user) => {
    const signedIn = !!user;
    if (appRoot) appRoot.hidden = !signedIn;
    if (authBox) authBox.hidden = signedIn;
    // po zalogowaniu zawsze wracamy z UI do trybu logowania
    if (signedIn) leaveSignupMode();
  });
});
