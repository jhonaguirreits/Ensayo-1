import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNBy-QKS5eNSinEI5ROOhR94YGKvbA0cg",
  authDomain: "codequestpro-78796.firebaseapp.com",
  projectId: "codequestpro-78796",
  storageBucket: "codequestpro-78796.firebasestorage.app",
  messagingSenderId: "383335669814",
  appId: "1:383335669814:web:70d1fd4e04b77aca63f897"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const ADMIN_EMAIL = 'jhon.aguirre@itspereira.edu.co';

let currentUserData = null;

// ==========================================
// 1. DICCIONARIO DE RETOS (Semanas)
// ==========================================
const weeks = {
  1: { title: "Primer Contacto (LED)", intro: "Aprenderás cómo Arduino envía electricidad.", code: "void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n}", matches: ["pinMode", "OUTPUT", "digitalWrite", "HIGH"] },
  2: { title: "Semáforo Inteligente", intro: "Lógica secuencial y condicional.", code: "int verde=2, amarillo=3, rojo=4;", matches: ["delay", "verde", "rojo"] }
};

// ==========================================
// 2. SISTEMA DE SESIÓN Y ROLES
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!user.email.endsWith("@itspereira.edu.co") && user.email !== ADMIN_EMAIL) {
      await signOut(auth);
      alert("Acceso denegado: Usa correo @itspereira.edu.co");
      return;
    }
    
    // Guardar o leer usuario de la Base de Datos
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      currentUserData = { nombre: user.displayName, email: user.email, monedas: 100, retosCompletados: 0 };
      await setDoc(userRef, currentUserData);
    } else {
      currentUserData = snap.data();
    }

    if (user.email === ADMIN_EMAIL) {
      mostrarPantalla('screen-teacher');
      window.renderTeacherDashboard();
    } else {
      mostrarPantalla('screen-app');
      actualizarUIEstudiante();
      window.loadWeek();
    }
  } else {
    mostrarPantalla('screen-login');
  }
  lucide.createIcons();
});

function mostrarPantalla(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ==========================================
// 3. FUNCIONES GLOBALES (Expuestas a HTML)
// ==========================================
window.loginConGoogle = () => signInWithPopup(auth, provider);
window.logout = () => signOut(auth);
window.toggleTheme = () => {
  const body = document.body;
  body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};

// CARGA DE RETOS
window.loadWeek = () => {
  const weekNum = document.getElementById('week-select').value;
  const data = weeks[weekNum];
  document.getElementById('w-title').textContent = data.title;
  document.getElementById('w-intro').textContent = data.intro;
  document.getElementById('w-code').textContent = data.code;
  document.getElementById('eval-feedback').textContent = '';
  document.getElementById('code-input').value = '';
};

// EVALUADOR SEGURO (REGEX)
window.verificarCodigo = async () => {
  const rawCode = document.getElementById('code-input').value;
  // Borrar comentarios // y /* */, y espacios
  const cleanCode = rawCode.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "");
  
  const weekNum = document.getElementById('week-select').value;
  const requeridos = weeks[weekNum].matches;
  
  let pasaPrueba = requeridos.every(req => cleanCode.includes(req.replace(/\s+/g, "")));

  if (pasaPrueba) {
    document.getElementById('eval-feedback').innerHTML = "✅ ¡Reto Superado! +20 Monedas";
    document.getElementById('eval-feedback').style.color = "var(--accent)";
    confetti();
    
    // Guardar progreso en Firestore
    currentUserData.monedas += 20;
    currentUserData.retosCompletados += 1;
    await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { 
      monedas: currentUserData.monedas,
      retosCompletados: currentUserData.retosCompletados
    });
    actualizarUIEstudiante();
  } else {
    document.getElementById('eval-feedback').innerHTML = "❌ El código no cumple los requisitos. Revisa bien.";
    document.getElementById('eval-feedback').style.color = "var(--error-color)";
  }
};

function actualizarUIEstudiante() {
  document.getElementById('user-monedas').textContent = currentUserData.monedas;
}

// ==========================================
// 4. FUNCIONES DEL DOCENTE (Dashboard)
// ==========================================
window.renderTeacherDashboard = async () => {
  const tbody = document.getElementById('teacher-tbody');
  tbody.innerHTML = '<tr><td colspan="4">Cargando datos desde la nube...</td></tr>';
  
  const querySnapshot = await getDocs(collection(db, "usuarios"));
  tbody.innerHTML = '';
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.email === ADMIN_EMAIL) return; // No listar al profe
    
    // Cálculo de nota algorítmico (Máximo 30 retos = 5.0)
    let nota = ((data.retosCompletados || 0) / 30) * 5;
    if (nota > 5.0) nota = 5.0;
    if (nota === 0) nota = 1.0; // Nota mínima

    tbody.innerHTML += `
      <tr>
        <td>${data.nombre}</td>
        <td>${data.email}</td>
        <td>${data.monedas || 0}</td>
        <td style="font-weight: bold; color: ${nota >= 3.0 ? 'var(--accent)' : 'var(--error-color)'}">${nota.toFixed(1)}</td>
      </tr>
    `;
  });
};

window.exportarCSV = () => {
  let csvContent = "data:text/csv;charset=utf-8,Nombre,Email,Monedas,Nota\n";
  const rows = document.querySelectorAll("#teacher-tbody tr");
  
  rows.forEach(row => {
    let rowData = [];
    row.querySelectorAll("td").forEach(cell => rowData.push(cell.innerText));
    csvContent += rowData.join(",") + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "notas_wokwi_academy.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};