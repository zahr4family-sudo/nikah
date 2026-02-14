// js/admin.js
// =====================================================
// ADMIN PANEL FUNCTIONALITY
// =====================================================

let adminUser = null;

// ⚠️ HARUS SAMA dengan yang di auth.js!
const SUPER_ADMIN_EMAILS = [
    'admin@nikahku.com',
    'superadmin@nikahku.com',
    // 👇 Tambahkan email admin Anda di sini
    'zahr4family@gmail.com'
];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Not logged in
            alert('Silakan login terlebih dahulu');
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is super admin
        if (!SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            alert('Anda tidak memiliki akses ke halaman Admin.\nEmail: ' + user.email);
            window.location.href = 'dashboard.html';
            return;
        }
        
        adminUser = user;
        console.log('✅ Admin logged in:', user.email);
        initializeAdmin();
    });
});

async function initializeAdmin() {
    try {
        await loadAdminDashboard();
        await loadPackageSettings();
        console.log('✅ Admin panel initialized');
    } catch (error) {
        console.error('Error initializing admin:', error);
        // Show error message but don't redirect
        showAdminToast('Gagal memuat beberapa data. Coba refresh halaman.', 'error');
    }
}

// =====================================================
// NAVIGATION
// =====================================================
function showAdminSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`admin-section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update nav active state
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active', 'bg-islamic-gold/20', 'text-islamic-gold');
        item.classList.add('hover:bg-gray-800');
    });
    
    // Find and activate the clicked nav item
    const activeNavItem = document.querySelector(`[onclick="showAdminSection('${sectionName}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active', 'bg-islamic-gold/20', 'text-islamic-gold');
        activeNavItem.classList.remove('hover:bg-gray-800');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'users': 'Manajemen User',
        'packages': 'Paket & Harga',
        'invitations': 'Semua Undangan',
        'transactions': 'Transaksi',
        'settings': 'Pengaturan'
    };
    document.getElementById('adminPageTitle').textContent = titles[sectionName] || 'Admin';
    
    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'users':
            loadAllUsers();
            break;
        case 'invitations':
            loadAllInvitations();
            break;
        case 'transactions':
            loadAllTransactions();
            break;
        case 'packages':
            loadPackageSettings();
            break;
    }
    
    // Close mobile sidebar
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.classList.add('-translate-x-full');
    }
}

function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('-translate-x-full');
}

// =====================================================
// ADMIN DASHBOARD
// =====================================================
async function loadAdminDashboard() {
    try {
        // Load total users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('adminTotalUsers').textContent = usersSnapshot.size;
        
        // Count premium users
        let premiumCount = 0;
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.plan && user.plan !== 'free') {
                premiumCount++;
            }
        });
        document.getElementById('adminPremiumUsers').textContent = premiumCount;
        
        // Load total invitations
        const invitationsSnapshot = await db.collection('invitations').get();
        document.getElementById('adminTotalInvitations').textContent = invitationsSnapshot.size;
        
        // Load revenue (from transactions)
        let totalRevenue = 0;
        try {
            const transactionsSnapshot = await db.collection('transactions')
                .where('status', '==', 'paid')
                .get();
            
            transactionsSnapshot.forEach(doc => {
                totalRevenue += doc.data().amount || 0;
            });
        } catch (e) {
            console.log('No transactions collection yet');
        }
        document.getElementById('adminRevenue').textContent = formatRupiah(totalRevenue);
        
        // Load recent users
        const recentUsersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        let recentUsersHtml = '';
        recentUsersSnapshot.forEach(doc => {
            const user = doc.data();
            const planBadge = getPlanBadge(user.plan);
            recentUsersHtml += `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-islamic-green rounded-full flex items-center justify-center text-white font-bold">
                            ${user.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${user.fullName || '-'}</p>
                            <p class="text-sm text-gray-500">${user.email}</p>
                        </div>
                    </div>
                    ${planBadge}
                </div>
            `;
        });
        document.getElementById('recentUsersAdmin').innerHTML = recentUsersHtml || '<p class="text-gray-500 text-center py-4">Tidak ada data</p>';
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        document.getElementById('recentUsersAdmin').innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat data</p>';
    }
}

// =====================================================
// USER MANAGEMENT
// =====================================================
async function loadAllUsers() {
    try {
        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('usersTableBody').innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">Tidak ada data user</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        for (const doc of snapshot.docs) {
            const user = doc.data();
            
            // Count user's invitations
            let invitationCount = 0;
            try {
                const invitationsSnapshot = await db.collection('invitations')
                    .where('userId', '==', doc.id)
                    .get();
                invitationCount = invitationsSnapshot.size;
            } catch (e) {
                console.log('Error counting invitations');
            }
            
            const planBadge = getPlanBadge(user.plan);
            const linksUsed = user.linkGenerated || 0;
            const maxLinks = user.maxLinks || 10;
            
            html += `
                <tr class="user-row hover:bg-gray-50" data-name="${(user.fullName || '').toLowerCase()}" data-plan="${user.plan || 'free'}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-islamic-green rounded-full flex items-center justify-center text-white font-bold">
                                ${user.fullName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">${user.fullName || '-'}</p>
                                <p class="text-sm text-gray-500">${user.phone || '-'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-gray-600">${user.email}</td>
                    <td class="px-6 py-4 text-center">${planBadge}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="font-medium ${linksUsed >= maxLinks ? 'text-red-500' : 'text-gray-800'}">${linksUsed}</span>
                        <span class="text-gray-400">/ ${user.plan === 'unlimited' ? '∞' : maxLinks}</span>
                    </td>
                    <td class="px-6 py-4 text-center text-gray-800">${invitationCount}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="editUser('${doc.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUser('${doc.id}')" class="text-red-500 hover:text-red-700" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('usersTableBody').innerHTML = html;
        console.log('✅ Users loaded');
        
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">Gagal memuat data: ${error.message}</td>
            </tr>
        `;
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('searchUser')?.value?.toLowerCase() || '';
    const planFilter = document.getElementById('filterUserPlan')?.value || '';
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        const name = row.dataset.name || '';
        const plan = row.dataset.plan || '';
        
        const matchesSearch = name.includes(searchTerm);
        const matchesPlan = !planFilter || plan === planFilter;
        
        row.style.display = matchesSearch && matchesPlan ? '' : 'none';
    });
}

async function editUser(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        const user = doc.data();
        
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserName').value = user.fullName || '';
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserPlan').value = user.plan || 'free';
        document.getElementById('editUserMaxLinks').value = user.maxLinks || 10;
        document.getElementById('editUserLinksUsed').value = user.linkGenerated || 0;
        
        document.getElementById('editUserModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading user:', error);
        showAdminToast('Gagal memuat data user', 'error');
    }
}

function closeEditUserModal() {
    document.getElementById('editUserModal').classList.add('hidden');
}

document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const plan = document.getElementById('editUserPlan').value;
    const maxLinks = parseInt(document.getElementById('editUserMaxLinks').value);
    const linksUsed = parseInt(document.getElementById('editUserLinksUsed').value);
    const name = document.getElementById('editUserName').value.trim();
    
    try {
        await db.collection('users').doc(userId).update({
            fullName: name,
            plan: plan,
            maxLinks: plan === 'unlimited' ? 999999 : maxLinks,
            linkGenerated: linksUsed
        });
        
        closeEditUserModal();
        loadAllUsers();
        showAdminToast('User berhasil diupdate');
        
    } catch (error) {
        console.error('Error updating user:', error);
        showAdminToast('Gagal mengupdate user', 'error');
    }
});

async function deleteUser(userId) {
    if (!confirm('Hapus user ini? Semua data undangan juga akan dihapus.')) return;
    
    try {
        // Delete user's invitations
        const invitationsSnapshot = await db.collection('invitations')
            .where('userId', '==', userId)
            .get();
        
        const batch = db.batch();
        
        for (const invDoc of invitationsSnapshot.docs) {
            // Delete subcollections
            const guestsSnapshot = await invDoc.ref.collection('guests').get();
            guestsSnapshot.forEach(guestDoc => {
                batch.delete(guestDoc.ref);
            });
            
            const wishesSnapshot = await invDoc.ref.collection('wishes').get();
            wishesSnapshot.forEach(wishDoc => {
                batch.delete(wishDoc.ref);
            });
            
            batch.delete(invDoc.ref);
        }
        
        // Delete user
        batch.delete(db.collection('users').doc(userId));
        
        await batch.commit();
        
        loadAllUsers();
        loadAdminDashboard();
        showAdminToast('User berhasil dihapus');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showAdminToast('Gagal menghapus user', 'error');
    }
}

// =====================================================
// PACKAGE SETTINGS
// =====================================================
async function loadPackageSettings() {
    try {
        const doc = await db.collection('settings').doc('packages').get();
        
        if (doc.exists) {
            const settings = doc.data();
            
            // Free package
            if (settings.free) {
                document.getElementById('freeMaxLinks').value = settings.free.maxLinks || 10;
                document.getElementById('freeMaxInvitations').value = settings.free.maxInvitations || 1;
                document.getElementById('freeFeatures').value = settings.free.features || 'Template Basic, Tanpa Musik';
            }
            
            // Basic package
            if (settings.basic) {
                document.getElementById('basicPrice').value = settings.basic.price || 99000;
                document.getElementById('basicMaxLinks').value = settings.basic.maxLinks || 100;
                document.getElementById('basicMaxInvitations').value = settings.basic.maxInvitations || 1;
                document.getElementById('basicDuration').value = settings.basic.duration || 30;
            }
            
            // Premium package
            if (settings.premium) {
                document.getElementById('premiumPrice').value = settings.premium.price || 199000;
                document.getElementById('premiumMaxLinks').value = settings.premium.maxLinks || 500;
                document.getElementById('premiumMaxInvitations').value = settings.premium.maxInvitations || 3;
                document.getElementById('premiumDuration').value = settings.premium.duration || 60;
            }
            
            // Unlimited package
            if (settings.unlimited) {
                document.getElementById('unlimitedPrice').value = settings.unlimited.price || 499000;
                document.getElementById('unlimitedDuration').value = settings.unlimited.duration || 365;
            }
        }
        
        console.log('✅ Package settings loaded');
        
    } catch (error) {
        console.error('Error loading package settings:', error);
    }
}

document.getElementById('packageSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = {
        free: {
            maxLinks: parseInt(document.getElementById('freeMaxLinks').value) || 10,
            maxInvitations: parseInt(document.getElementById('freeMaxInvitations').value) || 1,
            features: document.getElementById('freeFeatures').value || 'Template Basic',
            price: 0,
            duration: 7
        },
        basic: {
            price: parseInt(document.getElementById('basicPrice').value) || 99000,
            maxLinks: parseInt(document.getElementById('basicMaxLinks').value) || 100,
            maxInvitations: parseInt(document.getElementById('basicMaxInvitations').value) || 1,
            duration: parseInt(document.getElementById('basicDuration').value) || 30
        },
        premium: {
            price: parseInt(document.getElementById('premiumPrice').value) || 199000,
            maxLinks: parseInt(document.getElementById('premiumMaxLinks').value) || 500,
            maxInvitations: parseInt(document.getElementById('premiumMaxInvitations').value) || 3,
            duration: parseInt(document.getElementById('premiumDuration').value) || 60
        },
        unlimited: {
            price: parseInt(document.getElementById('unlimitedPrice').value) || 499000,
            maxLinks: 999999,
            maxInvitations: 999999,
            duration: parseInt(document.getElementById('unlimitedDuration').value) || 365
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminUser.uid
    };
    
    try {
        await db.collection('settings').doc('packages').set(settings, { merge: true });
        showAdminToast('Pengaturan paket berhasil disimpan');
        
    } catch (error) {
        console.error('Error saving package settings:', error);
        showAdminToast('Gagal menyimpan pengaturan', 'error');
    }
});

// =====================================================
// ALL INVITATIONS
// =====================================================
async function loadAllInvitations() {
    try {
        const snapshot = await db.collection('invitations')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('allInvitationsTableBody').innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">Tidak ada undangan</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        for (const doc of snapshot.docs) {
            const inv = doc.data();
            
            // Get owner info
            let ownerName = '-';
            if (inv.userId) {
                try {
                    const userDoc = await db.collection('users').doc(inv.userId).get();
                    if (userDoc.exists) {
                        ownerName = userDoc.data().fullName || userDoc.data().email;
                    }
                } catch (e) {
                    console.log('Error getting user');
                }
            }
            
            // Count guests
            let guestCount = 0;
            try {
                const guestsSnapshot = await doc.ref.collection('guests').get();
                guestCount = guestsSnapshot.size;
            } catch (e) {
                console.log('Error counting guests');
            }
            
            const eventDate = inv.akad?.date ? formatDateIndonesian(inv.akad.date) : '-';
            
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800">${inv.groom?.name || '-'} & ${inv.bride?.name || '-'}</p>
                    </td>
                    <td class="px-6 py-4 text-gray-600">${ownerName}</td>
                    <td class="px-6 py-4 text-center text-gray-600">${eventDate}</td>
                    <td class="px-6 py-4 text-center text-gray-800">${guestCount}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <a href="invitation.html?id=${doc.id}" target="_blank" class="text-blue-500 hover:text-blue-700 mr-2" title="Lihat">
                            <i class="fas fa-eye"></i>
                        </a>
                        <button onclick="deleteInvitationAdmin('${doc.id}')" class="text-red-500 hover:text-red-700" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('allInvitationsTableBody').innerHTML = html;
        console.log('✅ Invitations loaded');
        
    } catch (error) {
        console.error('Error loading invitations:', error);
        document.getElementById('allInvitationsTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">Gagal memuat data</td>
            </tr>
        `;
    }
}

async function deleteInvitationAdmin(invitationId) {
    if (!confirm('Hapus undangan ini?')) return;
    
    try {
        const invRef = db.collection('invitations').doc(invitationId);
        
        // Delete subcollections
        const guestsSnapshot = await invRef.collection('guests').get();
        const wishesSnapshot = await invRef.collection('wishes').get();
        
        const batch = db.batch();
        guestsSnapshot.forEach(doc => batch.delete(doc.ref));
        wishesSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(invRef);
        
        await batch.commit();
        
        loadAllInvitations();
        loadAdminDashboard();
        showAdminToast('Undangan berhasil dihapus');
        
    } catch (error) {
        console.error('Error deleting invitation:', error);
        showAdminToast('Gagal menghapus undangan', 'error');
    }
}

// =====================================================
// TRANSACTIONS
// =====================================================
async function loadAllTransactions() {
    try {
        const snapshot = await db.collection('transactions')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('transactionsTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">Belum ada transaksi</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        for (const doc of snapshot.docs) {
            const trx = doc.data();
            
            // Get user info
            let userName = '-';
            if (trx.userId) {
                try {
                    const userDoc = await db.collection('users').doc(trx.userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().fullName || userDoc.data().email;
                    }
                } catch (e) {
                    console.log('Error getting user');
                }
            }
            
            const statusBadge = getTransactionStatusBadge(trx.status);
            const date = trx.createdAt?.toDate ? trx.createdAt.toDate().toLocaleDateString('id-ID') : '-';
            
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-mono text-sm text-gray-600">${doc.id.slice(0, 12)}...</td>
                    <td class="px-6 py-4 text-gray-800">${userName}</td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 bg-islamic-gold/20 text-islamic-brown rounded-full text-xs font-medium capitalize">
                            ${trx.package || '-'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right font-medium text-gray-800">${formatRupiah(trx.amount)}</td>
                    <td class="px-6 py-4 text-center">${statusBadge}</td>
                    <td class="px-6 py-4 text-center text-gray-600">${date}</td>
                    <td class="px-6 py-4 text-center">
                        ${trx.status === 'pending' ? `
                            <button onclick="confirmPayment('${doc.id}')" class="text-green-500 hover:text-green-700 mr-2" title="Konfirmasi">
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button onclick="rejectPayment('${doc.id}')" class="text-red-500 hover:text-red-700 mr-2" title="Tolak">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        ` : ''}
                        <button onclick="viewTransaction('${doc.id}')" class="text-blue-500 hover:text-blue-700" title="Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('transactionsTableBody').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Belum ada transaksi</td>
            </tr>
        `;
    }
}

async function confirmPayment(transactionId) {
    if (!confirm('Konfirmasi pembayaran ini?')) return;
    
    try {
        const trxDoc = await db.collection('transactions').doc(transactionId).get();
        const trx = trxDoc.data();
        
        // Get package limits
        const maxLinks = getDefaultMaxLinks(trx.package);
        const duration = getDefaultDuration(trx.package);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);
        
        // Update invitation plan
        await db.collection('invitations').doc(trx.invitationId).update({
            plan: trx.package,
            maxLinks: maxLinks,
            expiryDate: expiryDate
        });
        
        // Update transaction status
        await db.collection('transactions').doc(transactionId).update({
            status: 'paid',
            paidAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: adminUser.uid
        });
        
        loadAllTransactions();
        showAdminToast('Pembayaran dikonfirmasi!');
        
    } catch (error) {
        console.error('Error confirming payment:', error);
        showAdminToast('Gagal mengkonfirmasi', 'error');
    }
}

async function rejectPayment(transactionId) {
    if (!confirm('Tolak pembayaran ini?')) return;
    
    try {
        await db.collection('transactions').doc(transactionId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: adminUser.uid
        });
        
        loadAllTransactions();
        showAdminToast('Pembayaran ditolak');
        
    } catch (error) {
        console.error('Error rejecting payment:', error);
        showAdminToast('Gagal menolak', 'error');
    }
}

async function viewTransaction(transactionId) {
    try {
        const doc = await db.collection('transactions').doc(transactionId).get();
        const trx = doc.data();
        
        alert(`
Detail Transaksi
================
ID: ${transactionId}
Paket: ${trx.package?.toUpperCase()}
Jumlah: ${formatRupiah(trx.amount)}
Status: ${trx.status?.toUpperCase()}
Pengirim: ${trx.senderName || '-'}
Bank: ${trx.senderBank || '-'}
        `);
        
        if (trx.proofUrl) {
            if (confirm('Lihat bukti transfer?')) {
                window.open(trx.proofUrl, '_blank');
            }
        }
        
    } catch (error) {
        console.error('Error viewing transaction:', error);
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function getPlanBadge(plan) {
    const badges = {
        'free': '<span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Free</span>',
        'basic': '<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Basic</span>',
        'premium': '<span class="px-3 py-1 bg-islamic-gold/20 text-islamic-brown rounded-full text-xs font-medium">Premium</span>',
        'unlimited': '<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Unlimited</span>'
    };
    return badges[plan] || badges['free'];
}

function getTransactionStatusBadge(status) {
    const badges = {
        'pending': '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>',
        'paid': '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Paid</span>',
        'rejected': '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejected</span>',
        'expired': '<span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Expired</span>'
    };
    return badges[status] || badges['pending'];
}

function getDefaultMaxLinks(plan) {
    const limits = { 'free': 10, 'basic': 100, 'premium': 500, 'unlimited': 999999 };
    return limits[plan] || 10;
}

function getDefaultDuration(plan) {
    const durations = { 'free': 7, 'basic': 30, 'premium': 60, 'unlimited': 365 };
    return durations[plan] || 7;
}

function showAdminToast(message, type = 'success') {
    const toast = document.getElementById('adminToast');
    const toastMessage = document.getElementById('adminToastMessage');
    
    if (!toast || !toastMessage) {
        alert(message);
        return;
    }
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.remove('bg-red-500');
        toast.classList.add('bg-green-500');
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function adminLogout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

console.log('🛡️ Admin.js loaded successfully');
