// js/firebase-config.js
// =====================================================
// KONFIGURASI FIREBASE - Ganti dengan kredensial Anda
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyBtnuLRtwPQD_grof9rVAI4XCXgvGoIfm4",
  authDomain: "nikah-f9f54.firebaseapp.com",
  projectId: "nikah-f9f54",
  storageBucket: "nikah-f9f54.firebasestorage.app",
  messagingSenderId: "458457769050",
  appId: "1:458457769050:web:7f4d4ce7b0262d832ea463",
  measurementId: "G-Q49D13M39G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Auth state observer
function checkAuthState(callback) {
    auth.onAuthStateChanged((user) => {
        if (callback) callback(user);
    });
}

// Generate unique invitation ID
function generateInvitationId() {
    return 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Utility: Format date to Indonesian
function formatDateIndonesian(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Utility: Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Utility: Encode guest name for URL
function encodeGuestName(name) {
    return encodeURIComponent(name.trim().replace(/\s+/g, '+'));
}

// Utility: Decode guest name from URL
function decodeGuestName(encodedName) {
    if (!encodedName) return 'Tamu Undangan';
    return decodeURIComponent(encodedName.replace(/\+/g, ' '));
}

console.log('🔥 Firebase initialized successfully');