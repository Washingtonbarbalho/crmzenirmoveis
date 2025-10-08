// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}


const firebaseConfig = {
    apiKey: "AIzaSyB2lylkLmSLkO55rcX7FVQh3UBPEL9Vc58",
    authDomain: "crm-zenir-moveis.firebaseapp.com",
    projectId: "crm-zenir-moveis",
    storageBucket: "crm-zenir-moveis.appspot.com",
    messagingSenderId: "840752930737",
    appId: "1:840752930737:web:e4b8c2972fb62e5df9a790"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- UTILITY FUNCTIONS ---
const getFortalezaDate = () => new Date();
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};
const getYYYYMMDD = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Fortaleza'
    }).format(date);
};
const maskPhone = (event) => {
    let value = event.target.value.replace(/\D/g, '').slice(0, 11);
    value = value.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    event.target.value = value;
};
 const maskPV = (event) => {
    let value = event.target.value.replace(/[^0-9]/g, '');
    value = value.slice(0, 11);
    if (value.length > 9) { value = `PV-${value.slice(0,9)}-${value.slice(9)}`; } 
    else if (value.length > 0) { value = `PV-${value}`; }
    event.target.value = value.toUpperCase();
};

// --- MODULES ---
const appManager = {
    uiManager: {
        body: document.body,
        sidebar: document.getElementById('sidebar'),
        menuButton: document.getElementById('menu-button'),
        overlay: document.getElementById('overlay'),
        allCancelButtons: document.querySelectorAll('.cancel-btn'),
        allModals: document.querySelectorAll('.fixed.inset-0[id$="-modal"]'),
        pageTitle: document.getElementById('page-title'),
        loadingSpinner: document.getElementById('loading-spinner'),
        userDisplayName: document.getElementById('user-display-name'),
        init() {
            this.menuButton.addEventListener('click', () => {
                 this.sidebar.classList.toggle('open'); this.overlay.classList.toggle('hidden');
            });
            this.overlay.addEventListener('click', () => {
                 this.sidebar.classList.remove('open'); this.overlay.classList.add('hidden');
            });
            this.allCancelButtons.forEach(btn => btn.addEventListener('click', () => {
                this.allModals.forEach(modal => modal.classList.add('hidden'));
                this.body.classList.remove('modal-open');
            }));
             document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', e => {
                e.preventDefault(); this.showPage(l.dataset.page);
            }));
        },
        showPage(pageId) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`${pageId}-page`).classList.remove('hidden');
            const titles = { leads: 'Gerenciamento de Leads', 'pos-venda': 'Gerenciamento Pós-venda', sac: 'Gerenciamento SAC', users: 'Gerenciamento de Usuários' };
            this.pageTitle.textContent = titles[pageId] || 'CRM Zenir';
            document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('bg-zenir-blue-dark', l.dataset.page === pageId));
            localStorage.setItem('lastVisitedPage', pageId); // Save current page
            this.sidebar.classList.remove('open');
            this.overlay.classList.add('hidden');
            this.body.classList.remove('modal-open');
        },
        showLoading(show) {
            this.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    },
    // ... (The rest of the JS code from the previous version goes here, unchanged)
};

// --- INITIALIZATION ---
appManager.authManager.init();
