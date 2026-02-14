// js/auth.js
// =====================================================
// AUTHENTICATION MODULE - FIXED VERSION
// =====================================================

// Show/Hide Loading
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// Show Error Message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    } else {
        alert(message);
    }
}

// Show Success Message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    if (successDiv && successText) {
        successText.textContent = message;
        successDiv.classList.remove('hidden');
    }
}

// =====================================================
// LOGIN FORM HANDLER
// =====================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('Mohon isi semua field');
            return;
        }
        
        showLoading();
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Login successful:', userCredential.user.uid);
            
            // Check if admin
            if (isAdminEmail(email)) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            
            let errorMessage = 'Terjadi kesalahan saat login';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Email tidak terdaftar';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Password salah';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Terlalu banyak percobaan. Coba lagi nanti';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Email atau password salah';
                    break;
            }
            showError(errorMessage);
        }
    });
}

// =====================================================
// REGISTER FORM HANDLER
// =====================================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms')?.checked;
        
        // Validations
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            showError('Mohon isi semua field');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Password dan konfirmasi password tidak cocok');
            return;
        }
        
        if (password.length < 6) {
            showError('Password minimal 6 karakter');
            return;
        }
        
        if (terms === false) {
            showError('Anda harus menyetujui syarat dan ketentuan');
            return;
        }
        
        showLoading();
        
        try {
            // Create user account
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update profile
            await user.updateProfile({
                displayName: fullName
            });
            
            // Save user data to Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                fullName: fullName,
                email: email,
                phone: phone,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'free',
                maxLinks: 10,
                linkGenerated: 0,
                invitationsCreated: 0,
                isAdmin: isAdminEmail(email)
            });
            
            console.log('Registration successful:', user.uid);
            
            hideLoading();
            showSuccess('Pendaftaran berhasil! Mengarahkan ke dashboard...');
            
            // Redirect based on role
            setTimeout(() => {
                if (isAdminEmail(email)) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 2000);
            
        } catch (error) {
            hideLoading();
            console.error('Registration error:', error);
            
            let errorMessage = 'Terjadi kesalahan saat mendaftar';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email sudah terdaftar. Silakan login';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password terlalu lemah';
                    break;
            }
            showError(errorMessage);
        }
    });
}

// =====================================================
// GOOGLE SIGN IN - FIXED VERSION
// =====================================================
async function loginWithGoogle() {
    showLoading();
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Add scopes if needed
    provider.addScope('email');
    provider.addScope('profile');
    
    try {
        // Use signInWithPopup
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('Google sign-in successful:', user.email);
        
        // Check if user exists in Firestore
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    fullName: user.displayName || 'User',
                    email: user.email,
                    phone: '',
                    photoURL: user.photoURL || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    plan: 'free',
                    maxLinks: 10,
                    linkGenerated: 0,
                    invitationsCreated: 0,
                    isAdmin: isAdminEmail(user.email)
                });
            }
        } catch (firestoreError) {
            console.warn('Firestore error (will retry later):', firestoreError);
            // Continue anyway - Firestore might be initializing
        }
        
        hideLoading();
        
        // Redirect based on role
        if (isAdminEmail(user.email)) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
        
    } catch (error) {
        hideLoading();
        console.error('Google sign-in error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup, don't show error
            return;
        }
        
        if (error.code === 'auth/unauthorized-domain') {
            showError('Domain ini belum diizinkan. Hubungi admin untuk menambahkan domain di Firebase Console.');
            return;
        }
        
        showError('Gagal masuk dengan Google. Silakan coba login dengan email.');
    }
}

// Alternative: Sign in with redirect (for mobile/COOP issues)
async function loginWithGoogleRedirect() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    try {
        await auth.signInWithRedirect(provider);
    } catch (error) {
        console.error('Redirect error:', error);
        showError('Gagal mengarahkan ke Google Sign-in');
    }
}

// Handle redirect result (call this on page load)
async function handleGoogleRedirectResult() {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) {
            console.log('Redirect sign-in successful:', result.user.email);
            
            // Check/create user in Firestore
            const userDoc = await db.collection('users').doc(result.user.uid).get();
            
            if (!userDoc.exists) {
                await db.collection('users').doc(result.user.uid).set({
                    uid: result.user.uid,
                    fullName: result.user.displayName || 'User',
                    email: result.user.email,
                    phone: '',
                    photoURL: result.user.photoURL || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    plan: 'free',
                    maxLinks: 10,
                    linkGenerated: 0,
                    invitationsCreated: 0,
                    isAdmin: isAdminEmail(result.user.email)
                });
            }
            
            // Redirect based on role
            if (isAdminEmail(result.user.email)) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    } catch (error) {
        console.error('Redirect result error:', error);
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    handleGoogleRedirectResult();
});

// =====================================================
// ADMIN CHECK
// =====================================================
// ⚠️ GANTI DENGAN EMAIL ANDA!
const ADMIN_EMAILS = [
    'admin@nikahku.com',
    'superadmin@nikahku.com',
    // 👇 Tambahkan email admin Anda di sini
    'your-email@gmail.com'
];

function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// =====================================================
// LOGOUT FUNCTION
// =====================================================
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// =====================================================
// AUTH STATE CHECKER
// =====================================================
function requireAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });
}

function redirectIfLoggedIn() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            if (isAdminEmail(user.email)) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    });
}

console.log('🔐 Auth.js loaded successfully');
