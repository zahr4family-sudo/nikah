// js/auth.js
// =====================================================
// AUTHENTICATION MODULE
// =====================================================

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Show Error Message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
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
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
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
        const terms = document.getElementById('terms').checked;
        
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
        
        if (!terms) {
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
                invitationsCreated: 0
            });
            
            console.log('Registration successful:', user.uid);
            
            hideLoading();
            showSuccess('Pendaftaran berhasil! Mengarahkan ke dashboard...');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
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
// GOOGLE SIGN IN
// =====================================================
async function loginWithGoogle() {
    showLoading();
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in Firestore
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
                invitationsCreated: 0
            });
        }
        
        console.log('Google sign-in successful:', user.uid);
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        hideLoading();
        console.error('Google sign-in error:', error);
        
        if (error.code !== 'auth/popup-closed-by-user') {
            showError('Gagal masuk dengan Google. Coba lagi.');
        }
    }
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
            window.location.href = 'dashboard.html';
        }
    });
}