import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const ROOT_ADMIN = "jhon.aguirre@itspereira.edu.co";
let userProfile = null;

// ==========================================
// 1. INICIO DE SESIÓN Y CONTROL DE ROLES
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. Siempre iniciar en la vista de juego (estudiante)
        window.switchView('view-student');
        
        // 2. Cargar o Crear perfil
        const userRef = doc(db, "usuarios", user.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
            if (!user.email.endsWith("@itspereira.edu.co") && user.email !== ROOT_ADMIN) {
                alert("Debes usar tu correo institucional.");
                return window.logout();
            }
            userProfile = {
                nombre: user.displayName,
                email: user.email,
                rol: (user.email === ROOT_ADMIN) ? "admin" : "estudiante",
                monedas: 0,
                racha: 0
            };
            await setDoc(userRef, userProfile);
        } else {
            userProfile = snap.data();
            // Forzar admin si es el correo raíz
            if (user.email === ROOT_ADMIN) userProfile.rol = "admin";
        }

        // 3. Actualizar Interfaz
        document.getElementById('user-display-name').textContent = userProfile.nombre;
        document.getElementById('screen-login').classList.remove('active');
        document.getElementById('screen-app').classList.add('active');
        
        setupMenuByRole(userProfile.rol);
        lucide.createIcons();
    } else {
        document.getElementById('screen-login').classList.add('active');
        document.getElementById('screen-app').classList.remove('active');
    }
});

// ==========================================
// 2. GESTIÓN DE NAVEGACIÓN
// ==========================================
window.switchView = (viewId) => {
    // Cambiar clases de las secciones
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');

    // Cambiar estado activo de los botones del nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Resaltar el botón presionado
    const btnMap = { 'view-student': 'nav-jugar', 'view-teacher': 'nav-teacher', 'view-admin': 'nav-admin' };
    if(btnMap[viewId]) document.getElementById(btnMap[viewId]).classList.add('active');
};

function setupMenuByRole(rol) {
    const btnTeacher = document.getElementById('nav-teacher');
    const btnAdmin = document.getElementById('nav-admin');

    if (rol === "admin") {
        btnTeacher.style.display = "block";
        btnAdmin.style.display = "block";
    } else if (rol === "docente") {
        btnTeacher.style.display = "block";
        btnAdmin.style.display = "none";
    } else {
        btnTeacher.style.display = "none";
        btnAdmin.style.display = "none";
    }
}

// ==========================================
// 3. FUNCIONES DE ADMINISTRACIÓN (Muestras)
// ==========================================
window.addTeacher = async () => {
    const email = document.getElementById('input-new-teacher').value;
    if (!email) return;
    
    // Aquí buscamos al usuario por email y le cambiamos el rol
    const q = query(collection(db, "usuarios"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        alert("El usuario debe iniciar sesión al menos una vez para ser promovido.");
    } else {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "usuarios", userDoc.id), { rol: "docente" });
        alert(`${email} ahora es Docente.`);
        document.getElementById('input-new-teacher').value = "";
    }
};

window.login = () => signInWithPopup(auth, provider);
window.logout = () => signOut(auth);