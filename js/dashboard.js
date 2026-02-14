// js/dashboard.js
// =====================================================
// DASHBOARD FUNCTIONALITY
// =====================================================

let currentUser = null;
let currentInvitationId = null;
let currentStep = 1;

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        initializeDashboard();
    });
});

async function initializeDashboard() {
    // Update user info in UI
    updateUserInfo();
    
    // Load user stats
    await loadUserStats();
    
    // Load invitations for dropdowns
    await loadInvitationDropdowns();
    
    // Load recent invitations
    await loadRecentInvitations();
}

function updateUserInfo() {
    const displayName = currentUser.displayName || 'User';
    document.getElementById('userName').textContent = displayName;
    document.getElementById('welcomeName').textContent = displayName.split(' ')[0];
    
    if (currentUser.photoURL) {
        document.getElementById('userAvatar').src = currentUser.photoURL;
    } else {
        document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1B4332&color=fff`;
    }
}

// =====================================================
// NAVIGATION
// =====================================================
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-white/20');
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'create': 'Buat Undangan',
        'invitations': 'Undangan Saya',
        'guests': 'Manajemen Tamu',
        'rsvp': 'RSVP',
        'settings': 'Pengaturan'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.add('-translate-x-full');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
}

// =====================================================
// LOAD USER STATS
// =====================================================
async function loadUserStats() {
    try {
        // Get user's invitations
        const invitationsSnapshot = await db.collection('invitations')
            .where('userId', '==', currentUser.uid)
            .get();
        
        let totalGuests = 0;
        let confirmedGuests = 0;
        let declinedGuests = 0;
        
        for (const doc of invitationsSnapshot.docs) {
            const guestsSnapshot = await db.collection('invitations')
                .doc(doc.id)
                .collection('guests')
                .get();
            
            guestsSnapshot.forEach(guestDoc => {
                totalGuests++;
                const guest = guestDoc.data();
                if (guest.rsvpStatus === 'confirmed') confirmedGuests++;
                if (guest.rsvpStatus === 'declined') declinedGuests++;
            });
        }
        
        // Update stats
        document.getElementById('statInvitations').textContent = invitationsSnapshot.size;
        document.getElementById('statGuests').textContent = totalGuests;
        document.getElementById('statConfirmed').textContent = confirmedGuests;
        document.getElementById('statDeclined').textContent = declinedGuests;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// =====================================================
// MULTI-STEP FORM NAVIGATION
// =====================================================
function nextStep(step) {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Hide current step
    document.getElementById(`formStep${currentStep}`).classList.add('hidden');
    
    // Show next step
    document.getElementById(`formStep${step}`).classList.remove('hidden');
    
    // Update progress indicators
    updateStepIndicators(step);
    
    // If final step, generate review
    if (step === 4) {
        generateReviewSummary();
    }
    
    currentStep = step;
}

function prevStep(step) {
    document.getElementById(`formStep${currentStep}`).classList.add('hidden');
    document.getElementById(`formStep${step}`).classList.remove('hidden');
    updateStepIndicators(step);
    currentStep = step;
}

function updateStepIndicators(step) {
    const indicators = document.querySelectorAll('.step-indicator');
    const progressLines = document.querySelectorAll('.progress-line');
    
    indicators.forEach((indicator, index) => {
        const circle = indicator.querySelector('div');
        const text = indicator.querySelector('span');
        
        if (index < step) {
            circle.classList.remove('bg-gray-200', 'text-gray-500');
            circle.classList.add('bg-islamic-green', 'text-white');
            text.classList.remove('text-gray-500');
            text.classList.add('text-islamic-green', 'font-medium');
        } else {
            circle.classList.remove('bg-islamic-green', 'text-white');
            circle.classList.add('bg-gray-200', 'text-gray-500');
            text.classList.remove('text-islamic-green', 'font-medium');
            text.classList.add('text-gray-500');
        }
    });
    
    progressLines.forEach((line, index) => {
        line.style.width = index < step - 1 ? '100%' : '0%';
    });
}

function validateStep(step) {
    switch (step) {
        case 1:
            const groomName = document.getElementById('groomName').value.trim();
            const brideName = document.getElementById('brideName').value.trim();
            if (!groomName || !brideName) {
                showToast('Mohon isi nama mempelai pria dan wanita', 'error');
                return false;
            }
            return true;
        case 2:
            const akadDate = document.getElementById('akadDate').value;
            const akadTime = document.getElementById('akadTime').value;
            const akadLocation = document.getElementById('akadLocation').value.trim();
            if (!akadDate || !akadTime || !akadLocation) {
                showToast('Mohon lengkapi detail acara akad', 'error');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function generateReviewSummary() {
    const summary = `
        <div class="space-y-4">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-male text-blue-600"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Mempelai Pria</p>
                    <p class="font-semibold text-gray-800">${document.getElementById('groomName').value || '-'}</p>
                    <p class="text-sm text-gray-600">Putra dari Bpk. ${document.getElementById('groomFather').value || '-'} & Ibu ${document.getElementById('groomMother').value || '-'}</p>
                </div>
            </div>
            
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-female text-pink-600"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Mempelai Wanita</p>
                    <p class="font-semibold text-gray-800">${document.getElementById('brideName').value || '-'}</p>
                    <p class="text-sm text-gray-600">Putri dari Bpk. ${document.getElementById('brideFather').value || '-'} & Ibu ${document.getElementById('brideMother').value || '-'}</p>
                </div>
            </div>
            
            <hr class="my-4">
            
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-islamic-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-ring text-islamic-green"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Akad Nikah</p>
                    <p class="font-semibold text-gray-800">${formatDateIndonesian(document.getElementById('akadDate').value)} | ${document.getElementById('akadTime').value} WIB</p>
                    <p class="text-sm text-gray-600">${document.getElementById('akadLocation').value || '-'}</p>
                </div>
            </div>
            
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-islamic-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-glass-cheers text-islamic-gold"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Resepsi</p>
                    <p class="font-semibold text-gray-800">${formatDateIndonesian(document.getElementById('resepsiDate').value)} | ${document.getElementById('resepsiTime').value} WIB</p>
                    <p class="text-sm text-gray-600">${document.getElementById('resepsiLocation').value || '-'}</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('reviewSummary').innerHTML = summary;
}

// =====================================================
// IMAGE PREVIEW
// =====================================================
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById('coverPlaceholder');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.querySelector('img').src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewGallery(input) {
    const preview = document.getElementById('galleryPreview');
    const placeholder = document.getElementById('galleryPlaceholder');
    
    preview.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        placeholder.classList.add('hidden');
        
        Array.from(input.files).slice(0, 6).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-20 object-cover rounded-lg';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    } else {
        placeholder.classList.remove('hidden');
    }
}

// =====================================================
// SAVE INVITATION
// =====================================================
document.getElementById('invitationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    showLoading();
    
    try {
        const invitationId = generateInvitationId();
        
        const invitationData = {
            id: invitationId,
            userId: currentUser.uid,
            groom: {
                name: document.getElementById('groomName').value.trim(),
                father: document.getElementById('groomFather').value.trim(),
                mother: document.getElementById('groomMother').value.trim(),
                childOrder: document.getElementById('groomChildOrder').value.trim()
            },
            bride: {
                name: document.getElementById('brideName').value.trim(),
                father: document.getElementById('brideFather').value.trim(),
                mother: document.getElementById('brideMother').value.trim(),
                childOrder: document.getElementById('brideChildOrder').value.trim()
            },
            akad: {
                date: document.getElementById('akadDate').value,
                time: document.getElementById('akadTime').value,
                location: document.getElementById('akadLocation').value.trim()
            },
            resepsi: {
                date: document.getElementById('resepsiDate').value,
                time: document.getElementById('resepsiTime').value,
                location: document.getElementById('resepsiLocation').value.trim()
            },
            mapsLink: document.getElementById('mapsLink').value.trim(),
            specialMessage: document.getElementById('specialMessage').value.trim(),
            template: 'islamic-elegant',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };
        
        // Save to Firestore
        await db.collection('invitations').doc(invitationId).set(invitationData);
        
        // Update user's invitation count
        await db.collection('users').doc(currentUser.uid).update({
            invitationsCreated: firebase.firestore.FieldValue.increment(1)
        });
        
        hideLoading();
        showToast('Undangan berhasil dibuat! 🎉');
        
        // Reset form and go back to step 1
        document.getElementById('invitationForm').reset();
        currentStep = 1;
        showSection('invitations');
        
        // Reload data
        await loadUserStats();
        await loadInvitationDropdowns();
        await loadInvitationsList();
        
    } catch (error) {
        hideLoading();
        console.error('Error saving invitation:', error);
        showToast('Gagal menyimpan undangan', 'error');
    }
});

// =====================================================
// LOAD INVITATIONS
// =====================================================
async function loadInvitationDropdowns() {
    try {
        const snapshot = await db.collection('invitations')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const options = snapshot.docs.map(doc => {
            const data = doc.data();
            return `<option value="${doc.id}">${data.groom.name} & ${data.bride.name}</option>`;
        }).join('');
        
        document.getElementById('selectInvitation').innerHTML = '<option value="">-- Pilih Undangan --</option>' + options;
        document.getElementById('rsvpSelectInvitation').innerHTML = '<option value="">-- Pilih Undangan --</option>' + options;
        
    } catch (error) {
        console.error('Error loading invitations:', error);
    }
}

async function loadRecentInvitations() {
    try {
        const snapshot = await db.collection('invitations')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        if (snapshot.empty) {
            document.getElementById('recentInvitations').innerHTML = `
                <p class="text-gray-500 text-center py-8">
                    Belum ada undangan. 
                    <a href="#" onclick="showSection('create')" class="text-islamic-green hover:underline">Buat sekarang!</a>
                </p>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.akad?.date ? formatDateIndonesian(data.akad.date) : '-';
            
            html += `
                <div class="flex items-center justify-between p-4 bg-islamic-cream rounded-xl">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-islamic-green/20 rounded-xl flex items-center justify-center">
                            <i class="fas fa-heart text-islamic-green"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${data.groom?.name || '-'} & ${data.bride?.name || '-'}</p>
                            <p class="text-sm text-gray-500">${date}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <a href="invitation.html?id=${doc.id}" target="_blank" class="px-4 py-2 text-sm bg-islamic-green text-white rounded-lg hover:bg-islamic-green-light transition">
                            <i class="fas fa-eye mr-1"></i>Lihat
                        </a>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('recentInvitations').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent invitations:', error);
    }
}

async function loadInvitationsList() {
    try {
        const snapshot = await db.collection('invitations')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('invitationsList').innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-envelope text-6xl text-gray-300 mb-4"></i>
                    <p>Belum ada undangan.</p>
                    <button onclick="showSection('create')" class="mt-4 text-islamic-green hover:underline">
                        Buat undangan pertama Anda →
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.akad?.date ? formatDateIndonesian(data.akad.date) : '-';
            
            html += `
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                    <div class="h-32 bg-gradient-to-r from-islamic-green to-islamic-green-light relative">
                        <div class="absolute inset-0 islamic-pattern-bg opacity-20"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-white text-center">
                            <div>
                                <p class="text-xl font-bold">${data.groom?.name || '-'}</p>
                                <p class="text-islamic-gold">&</p>
                                <p class="text-xl font-bold">${data.bride?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-4">
                        <p class="text-sm text-gray-600 mb-3">
                            <i class="fas fa-calendar-alt text-islamic-gold mr-2"></i>${date}
                        </p>
                        <div class="flex gap-2">
                            <a href="invitation.html?id=${doc.id}" target="_blank" 
                                class="flex-1 text-center px-3 py-2 bg-islamic-green text-white text-sm rounded-lg hover:bg-islamic-green-light transition">
                                <i class="fas fa-eye mr-1"></i>Preview
                            </a>
                            <button onclick="shareInvitation('${doc.id}')" 
                                class="px-3 py-2 bg-islamic-gold text-white text-sm rounded-lg hover:bg-islamic-brown transition">
                                <i class="fas fa-share-alt"></i>
                            </button>
                            <button onclick="deleteInvitation('${doc.id}')" 
                                class="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('invitationsList').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading invitations list:', error);
    }
}

// =====================================================
// GUEST MANAGEMENT
// =====================================================
async function loadGuests() {
    const invitationId = document.getElementById('selectInvitation').value;
    currentInvitationId = invitationId;
    
    if (!invitationId) {
        document.getElementById('guestTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                    Pilih undangan untuk melihat daftar tamu
                </td>
            </tr>
        `;
        return;
    }
    
    try {
        const snapshot = await db.collection('invitations')
            .doc(invitationId)
            .collection('guests')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('guestTableBody').innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                        Belum ada tamu. 
                        <button onclick="openAddGuestModal()" class="text-islamic-green hover:underline">Tambah tamu</button>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const guest = doc.data();
            const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
            const guestLink = `${baseUrl}invitation.html?id=${invitationId}&to=${encodeGuestName(guest.name)}`;
            
            let statusBadge = '';
            switch (guest.rsvpStatus) {
                case 'confirmed':
                    statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Hadir</span>';
                    break;
                case 'declined':
                    statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Tidak Hadir</span>';
                    break;
                default:
                    statusBadge = '<span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Pending</span>';
            }
            
            html += `
                <tr class="guest-row hover:bg-gray-50" data-name="${guest.name.toLowerCase()}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-islamic-green/10 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-islamic-green"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">${guest.name}</p>
                                <p class="text-sm text-gray-500">${guest.phone || '-'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="max-w-xs truncate text-sm text-gray-600">${guestLink}</div>
                    </td>
                    <td class="px-6 py-4 text-center">${statusBadge}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="showGuestLink('${guest.name}', '${guestLink}')" class="text-islamic-green hover:text-islamic-gold mr-2" title="Copy Link">
                            <i class="fas fa-link"></i>
                        </button>
                        <button onclick="deleteGuest('${doc.id}')" class="text-red-500 hover:text-red-700" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        document.getElementById('guestTableBody').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

function filterGuests() {
    const searchTerm = document.getElementById('searchGuest').value.toLowerCase();
    const rows = document.querySelectorAll('.guest-row');
    
    rows.forEach(row => {
        const name = row.dataset.name;
        row.style.display = name.includes(searchTerm) ? '' : 'none';
    });
}

function openAddGuestModal() {
    if (!currentInvitationId) {
        showToast('Pilih undangan terlebih dahulu', 'error');
        return;
    }
    document.getElementById('addGuestModal').classList.remove('hidden');
}

function closeAddGuestModal() {
    document.getElementById('addGuestModal').classList.add('hidden');
    document.getElementById('addGuestForm').reset();
}

document.getElementById('addGuestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const guestName = document.getElementById('guestName').value.trim();
    const guestPhone = document.getElementById('guestPhone').value.trim();
    
    if (!guestName) {
        showToast('Nama tamu wajib diisi', 'error');
        return;
    }
    
    try {
        await db.collection('invitations')
            .doc(currentInvitationId)
            .collection('guests')
            .add({
                name: guestName,
                phone: guestPhone,
                rsvpStatus: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        closeAddGuestModal();
        loadGuests();
        showToast('Tamu berhasil ditambahkan!');
        
    } catch (error) {
        console.error('Error adding guest:', error);
        showToast('Gagal menambahkan tamu', 'error');
    }
});

async function deleteGuest(guestId) {
    if (!confirm('Hapus tamu ini?')) return;
    
    try {
        await db.collection('invitations')
            .doc(currentInvitationId)
            .collection('guests')
            .doc(guestId)
            .delete();
        
        loadGuests();
        showToast('Tamu berhasil dihapus');
        
    } catch (error) {
        console.error('Error deleting guest:', error);
        showToast('Gagal menghapus tamu', 'error');
    }
}

// =====================================================
// LINK GENERATION
// =====================================================
function showGuestLink(guestName, link) {
    document.getElementById('linkGuestName').textContent = guestName;
    document.getElementById('generatedLink').value = link;
    
    // WhatsApp share
    const waMessage = encodeURIComponent(`Assalamualaikum ${guestName},\n\nKami mengundang Bapak/Ibu/Saudara untuk hadir di acara pernikahan kami.\n\nBuka undangan: ${link}\n\nTerima kasih 🙏`);
    document.getElementById('whatsappShare').href = `https://wa.me/?text=${waMessage}`;
    
    document.getElementById('linkModal').classList.remove('hidden');
}

function closeLinkModal() {
    document.getElementById('linkModal').classList.add('hidden');
}

function copyLink() {
    const linkInput = document.getElementById('generatedLink');
    linkInput.select();
    document.execCommand('copy');
    showToast('Link berhasil disalin!');
}

// =====================================================
// RSVP
// =====================================================
async function loadRSVP() {
    const invitationId = document.getElementById('rsvpSelectInvitation').value;
    
    if (!invitationId) {
        document.getElementById('rsvpTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                    Pilih undangan untuk melihat RSVP
                </td>
            </tr>
        `;
        return;
    }
    
    try {
        const snapshot = await db.collection('invitations')
            .doc(invitationId)
            .collection('guests')
            .get();
        
        let confirmed = 0, declined = 0, pending = 0;
        let html = '';
        
        snapshot.forEach(doc => {
            const guest = doc.data();
            
            switch (guest.rsvpStatus) {
                case 'confirmed':
                    confirmed++;
                    break;
                case 'declined':
                    declined++;
                    break;
                default:
                    pending++;
            }
            
            let statusBadge = '';
            switch (guest.rsvpStatus) {
                case 'confirmed':
                    statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Hadir</span>';
                    break;
                case 'declined':
                    statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">✗ Tidak Hadir</span>';
                    break;
                default:
                    statusBadge = '<span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">- Pending</span>';
            }
            
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-800">${guest.name}</td>
                    <td class="px-6 py-4 text-center">${statusBadge}</td>
                    <td class="px-6 py-4 text-center">${guest.guestCount || '-'}</td>
                    <td class="px-6 py-4 text-gray-600">${guest.message || '-'}</td>
                </tr>
// =====================================================
// LANJUTAN DARI KODE SEBELUMNYA...
// =====================================================

// ... (kode sebelumnya tetap)

            `;
        });
        
        // Update summary
        document.getElementById('rsvpConfirmed').textContent = confirmed;
        document.getElementById('rsvpDeclined').textContent = declined;
        document.getElementById('rsvpPending').textContent = pending;
        
        if (snapshot.empty) {
            html = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                        Belum ada data RSVP
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('rsvpTableBody').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading RSVP:', error);
    }
}

// =====================================================
// DELETE INVITATION
// =====================================================
async function deleteInvitation(invitationId) {
    if (!confirm('Hapus undangan ini? Semua data tamu juga akan dihapus.')) return;
    
    showLoading();
    
    try {
        // Delete all guests first
        const guestsSnapshot = await db.collection('invitations')
            .doc(invitationId)
            .collection('guests')
            .get();
        
        const batch = db.batch();
        guestsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete invitation
        batch.delete(db.collection('invitations').doc(invitationId));
        
        await batch.commit();
        
        // Update user's invitation count
        await db.collection('users').doc(currentUser.uid).update({
            invitationsCreated: firebase.firestore.FieldValue.increment(-1)
        });
        
        hideLoading();
        showToast('Undangan berhasil dihapus');
        
        await loadUserStats();
        await loadInvitationDropdowns();
        await loadInvitationsList();
        await loadRecentInvitations();
        
    } catch (error) {
        hideLoading();
        console.error('Error deleting invitation:', error);
        showToast('Gagal menghapus undangan', 'error');
    }
}

// =====================================================
// SHARE INVITATION
// =====================================================
function shareInvitation(invitationId) {
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
    const link = `${baseUrl}invitation.html?id=${invitationId}`;
    
    document.getElementById('linkGuestName').textContent = 'Umum (Tanpa Nama)';
    document.getElementById('generatedLink').value = link;
    
    const waMessage = encodeURIComponent(`Assalamualaikum,\n\nKami mengundang Bapak/Ibu/Saudara untuk hadir di acara pernikahan kami.\n\nBuka undangan: ${link}\n\nTerima kasih 🙏`);
    document.getElementById('whatsappShare').href = `https://wa.me/?text=${waMessage}`;
    
    document.getElementById('linkModal').classList.remove('hidden');
}

// =====================================================
// TOAST NOTIFICATION
// =====================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('successToast');
    const toastMessage = document.getElementById('toastMessage');
    
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

// =====================================================
// PACKAGE/QUOTA MANAGEMENT
// =====================================================
let userPlan = null;
let userQuota = null;

async function loadUserPlan() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        userPlan = userData.plan || 'free';
        userQuota = {
            linkGenerated: userData.linkGenerated || 0,
            maxLinks: userData.maxLinks || 10 // Default free plan
        };
        
        // Update UI
        updateQuotaDisplay();
        
        return { plan: userPlan, quota: userQuota };
    } catch (error) {
        console.error('Error loading user plan:', error);
        return null;
    }
}

function updateQuotaDisplay() {
    const quotaElement = document.getElementById('quotaDisplay');
    if (quotaElement) {
        const remaining = userQuota.maxLinks - userQuota.linkGenerated;
        quotaElement.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-link text-islamic-gold"></i>
                <span class="text-sm">${remaining}/${userQuota.maxLinks} link tersisa</span>
            </div>
        `;
    }
}

async function checkQuotaBeforeGenerate() {
    await loadUserPlan();
    
    if (userPlan === 'free' && userQuota.linkGenerated >= userQuota.maxLinks) {
        showUpgradeModal();
        return false;
    }
    
    return true;
}

async function incrementLinkCount() {
    try {
        await db.collection('users').doc(currentUser.uid).update({
            linkGenerated: firebase.firestore.FieldValue.increment(1)
        });
        userQuota.linkGenerated++;
        updateQuotaDisplay();
    } catch (error) {
        console.error('Error incrementing link count:', error);
    }
}

function showUpgradeModal() {
    document.getElementById('upgradeModal').classList.remove('hidden');
}

function closeUpgradeModal() {
    document.getElementById('upgradeModal').classList.add('hidden');
}

// =====================================================
// SETTINGS
// =====================================================
async function loadSettings() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        document.getElementById('settingsName').value = userData.fullName || '';
        document.getElementById('settingsEmail').value = userData.email || '';
        document.getElementById('settingsPhone').value = userData.phone || '';
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    showLoading();
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            fullName: document.getElementById('settingsName').value.trim(),
            phone: document.getElementById('settingsPhone').value.trim()
        });
        
        // Update display name in Firebase Auth
        await currentUser.updateProfile({
            displayName: document.getElementById('settingsName').value.trim()
        });
        
        hideLoading();
        showToast('Pengaturan berhasil disimpan!');
        updateUserInfo();
        
    } catch (error) {
        hideLoading();
        console.error('Error saving settings:', error);
        showToast('Gagal menyimpan pengaturan', 'error');
    }
});

// Load settings when settings section is shown
document.querySelector('[onclick="showSection(\'settings\')"]')?.addEventListener('click', loadSettings);

// =====================================================
// INITIALIZE WITH QUOTA CHECK
// =====================================================
async function initializeDashboard() {
    updateUserInfo();
    await loadUserPlan();
    await loadUserStats();
    await loadInvitationDropdowns();
    await loadRecentInvitations();
}

console.log('📋 Dashboard.js loaded successfully');
// =====================================================
// QUOTA SYSTEM - PER INVITATION (Per Nama Pengantin)
// =====================================================

let selectedUpgradePackage = null;
let upgradeTargetInvitation = null;

// Check invitation quota before adding guest
async function checkInvitationQuota(invitationId) {
    try {
        const invDoc = await db.collection('invitations').doc(invitationId).get();
        if (!invDoc.exists) return { allowed: false, message: 'Undangan tidak ditemukan' };
        
        const invitation = invDoc.data();
        const plan = invitation.plan || 'free';
        const linksGenerated = invitation.linksGenerated || 0;
        const maxLinks = invitation.maxLinks || getDefaultMaxLinks(plan);
        
        // Check if quota exceeded
        if (plan !== 'unlimited' && linksGenerated >= maxLinks) {
            return {
                allowed: false,
                message: 'Kuota link habis',
                linksGenerated,
                maxLinks,
                plan,
                invitationId
            };
        }
        
        // Check if quota is running low (less than 20%)
        const remaining = maxLinks - linksGenerated;
        const warningThreshold = Math.ceil(maxLinks * 0.2);
        
        return {
            allowed: true,
            linksGenerated,
            maxLinks,
            remaining,
            showWarning: remaining <= warningThreshold && plan !== 'unlimited',
            plan,
            invitationId
        };
        
    } catch (error) {
        console.error('Error checking quota:', error);
        return { allowed: false, message: 'Gagal memeriksa kuota' };
    }
}

function getDefaultMaxLinks(plan) {
    const limits = {
        'free': 10,
        'basic': 100,
        'premium': 500,
        'unlimited': 999999
    };
    return limits[plan] || 10;
}

function getDefaultDuration(plan) {
    const durations = {
        'free': 7,
        'basic': 30,
        'premium': 60,
        'unlimited': 365
    };
    return durations[plan] || 7;
}

// Increment link count for specific invitation
async function incrementInvitationLinkCount(invitationId) {
    try {
        await db.collection('invitations').doc(invitationId).update({
            linksGenerated: firebase.firestore.FieldValue.increment(1)
        });
        return true;
    } catch (error) {
        console.error('Error incrementing link count:', error);
        return false;
    }
}

// Modified: Add guest with quota check
async function addGuestWithQuotaCheck() {
    const guestName = document.getElementById('guestName').value.trim();
    const guestPhone = document.getElementById('guestPhone').value.trim();
    
    if (!guestName) {
        showToast('Nama tamu wajib diisi', 'error');
        return;
    }
    
    if (!currentInvitationId) {
        showToast('Pilih undangan terlebih dahulu', 'error');
        return;
    }
    
    // Check quota first
    const quotaCheck = await checkInvitationQuota(currentInvitationId);
    
    if (!quotaCheck.allowed) {
        closeAddGuestModal();
        showUpgradeModalForInvitation(currentInvitationId, quotaCheck);
        return;
    }
    
    try {
        // Add guest
        await db.collection('invitations')
            .doc(currentInvitationId)
            .collection('guests')
            .add({
                name: guestName,
                phone: guestPhone,
                rsvpStatus: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Increment link count
        await incrementInvitationLinkCount(currentInvitationId);
        
        closeAddGuestModal();
        loadGuests();
        showToast('Tamu berhasil ditambahkan!');
        
        // Show warning if quota is running low
        if (quotaCheck.showWarning) {
            showQuotaWarning(quotaCheck.remaining);
        }
        
    } catch (error) {
        console.error('Error adding guest:', error);
        showToast('Gagal menambahkan tamu', 'error');
    }
}

// Replace the original form submit handler
document.getElementById('addGuestForm')?.removeEventListener('submit', null);
document.getElementById('addGuestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addGuestWithQuotaCheck();
});

// Show quota warning
function showQuotaWarning(remaining) {
    const alert = document.getElementById('quotaWarningAlert');
    document.getElementById('quotaRemaining').textContent = remaining;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 10000);
}

// =====================================================
// UPGRADE MODAL FUNCTIONS
// =====================================================

function showUpgradeModalForInvitation(invitationId, quotaInfo) {
    upgradeTargetInvitation = invitationId;
    
    // Update modal info
    db.collection('invitations').doc(invitationId).get().then(doc => {
        const inv = doc.data();
        document.getElementById('upgradeInvitationName').textContent = 
            `${inv.groom?.name || '-'} & ${inv.bride?.name || '-'}`;
        document.getElementById('upgradeCurrentQuota').textContent = 
            `${quotaInfo.linksGenerated}/${quotaInfo.maxLinks} Link (${quotaInfo.linksGenerated >= quotaInfo.maxLinks ? 'Habis' : 'Tersisa ' + (quotaInfo.maxLinks - quotaInfo.linksGenerated)})`;
    });
    
    // Reset selection
    document.querySelectorAll('.upgrade-option').forEach(opt => {
        opt.classList.remove('border-islamic-green', 'bg-islamic-green/5');
        opt.querySelector('.upgrade-check')?.classList.add('hidden');
    });
    document.getElementById('paymentInfo').classList.add('hidden');
    selectedUpgradePackage = null;
    
    // Show modal
    document.getElementById('upgradeModal').classList.remove('hidden');
}

function showUpgradeModal() {
    if (currentInvitationId) {
        checkInvitationQuota(currentInvitationId).then(quotaInfo => {
            showUpgradeModalForInvitation(currentInvitationId, quotaInfo);
        });
    } else {
        showToast('Pilih undangan terlebih dahulu', 'error');
    }
}

function closeUpgradeModal() {
    document.getElementById('upgradeModal').classList.add('hidden');
    upgradeTargetInvitation = null;
    selectedUpgradePackage = null;
}

function selectUpgradePackage(element) {
    // Remove selection from all
    document.querySelectorAll('.upgrade-option').forEach(opt => {
        opt.classList.remove('border-islamic-green', 'bg-islamic-green/5');
        opt.querySelector('.upgrade-check')?.classList.add('hidden');
        opt.querySelector('.upgrade-check')?.classList.remove('bg-islamic-green');
    });
    
    // Select this one
    element.classList.add('border-islamic-green', 'bg-islamic-green/5');
    const check = element.querySelector('.upgrade-check');
    if (check) {
        check.classList.remove('hidden');
        check.classList.add('bg-islamic-green');
    }
    
    selectedUpgradePackage = {
        package: element.dataset.package,
        price: parseInt(element.dataset.price)
    };
    
    // Show payment info
    document.getElementById('paymentInfo').classList.remove('hidden');
    document.getElementById('selectedPackageName').textContent = selectedUpgradePackage.package.toUpperCase();
    document.getElementById('selectedPackagePrice').textContent = formatRupiah(selectedUpgradePackage.price);
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function processUpgrade() {
    if (!selectedUpgradePackage || !upgradeTargetInvitation) {
        showToast('Pilih paket upgrade terlebih dahulu', 'error');
        return;
    }
    
    // Set values for confirmation form
    document.getElementById('confirmInvitationId').value = upgradeTargetInvitation;
    document.getElementById('confirmPackage').value = selectedUpgradePackage.package;
    document.getElementById('confirmAmount').value = selectedUpgradePackage.price;
    
    // Close upgrade modal, show payment confirm modal
    closeUpgradeModal();
    document.getElementById('paymentConfirmModal').classList.remove('hidden');
}

function closePaymentConfirmModal() {
    document.getElementById('paymentConfirmModal').classList.add('hidden');
    document.getElementById('paymentConfirmForm').reset();
    document.getElementById('proofPreview').classList.add('hidden');
    document.getElementById('proofPlaceholder').classList.remove('hidden');
}

function previewPaymentProof(input) {
    const preview = document.getElementById('proofPreview');
    const placeholder = document.getElementById('proofPlaceholder');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.querySelector('img').src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Payment Confirmation Form Submit
document.getElementById('paymentConfirmForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const invitationId = document.getElementById('confirmInvitationId').value;
    const packageName = document.getElementById('confirmPackage').value;
    const amount = parseInt(document.getElementById('confirmAmount').value);
    const senderName = document.getElementById('senderName').value.trim();
    const senderBank = document.getElementById('senderBank').value;
    const proofFile = document.getElementById('paymentProof').files[0];
    
    if (!proofFile) {
        showToast('Upload bukti transfer', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Upload proof to Firebase Storage
        const storageRef = storage.ref();
        const proofRef = storageRef.child(`payment-proofs/${Date.now()}_${proofFile.name}`);
        await proofRef.put(proofFile);
        const proofUrl = await proofRef.getDownloadURL();
        
        // Create transaction record
        const transactionId = 'TRX' + Date.now().toString(36).toUpperCase();
        await db.collection('transactions').doc(transactionId).set({
            transactionId,
            userId: currentUser.uid,
            invitationId,
            package: packageName,
            amount,
            senderName,
            senderBank,
            proofUrl,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        hideLoading();
        closePaymentConfirmModal();
        
        showToast('Pembayaran berhasil dikirim! Menunggu verifikasi admin.');
        
        // Show success info
        alert(`Terima kasih!\n\nID Transaksi: ${transactionId}\n\nPembayaran Anda akan diverifikasi dalam 1x24 jam. Setelah diverifikasi, paket undangan akan otomatis diupgrade.`);
        
    } catch (error) {
        hideLoading();
        console.error('Error submitting payment:', error);
        showToast('Gagal mengirim pembayaran', 'error');
    }
});

// =====================================================
// DISPLAY QUOTA IN GUEST MANAGEMENT
// =====================================================

async function loadGuestsWithQuota() {
    const invitationId = document.getElementById('selectInvitation').value;
    currentInvitationId = invitationId;
    
    if (!invitationId) {
        document.getElementById('guestTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                    Pilih undangan untuk melihat daftar tamu
                </td>
            </tr>
        `;
        hideQuotaDisplay();
        return;
    }
    
    // Get invitation quota info
    const quotaInfo = await checkInvitationQuota(invitationId);
    showQuotaDisplay(quotaInfo);
    
    // Load guests (existing code)
    await loadGuests();
}

function showQuotaDisplay(quotaInfo) {
    let quotaHtml = document.getElementById('quotaDisplayContainer');
    
    if (!quotaHtml) {
        // Create quota display if not exists
        const container = document.querySelector('#section-guests .bg-white.rounded-2xl.shadow-lg.p-6.mb-6');
        if (container) {
            const quotaDiv = document.createElement('div');
            quotaDiv.id = 'quotaDisplayContainer';
            quotaDiv.className = 'mt-4 p-4 bg-gradient-to-r from-islamic-green/10 to-islamic-gold/10 rounded-xl';
            container.appendChild(quotaDiv);
            quotaHtml = quotaDiv;
        }
    }
    
    if (quotaHtml) {
        const percentage = quotaInfo.plan === 'unlimited' ? 100 : 
            Math.round((quotaInfo.linksGenerated / quotaInfo.maxLinks) * 100);
        const remaining = quotaInfo.plan === 'unlimited' ? '∞' : 
            (quotaInfo.maxLinks - quotaInfo.linksGenerated);
        
        let statusColor = 'bg-green-500';
        if (percentage >= 80) statusColor = 'bg-red-500';
        else if (percentage >= 60) statusColor = 'bg-yellow-500';
        
        quotaHtml.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 text-xs font-bold rounded-full ${getPlanBadgeClass(quotaInfo.plan)}">${quotaInfo.plan?.toUpperCase()}</span>
                        <span class="text-gray-600 text-sm">Kuota Link Tamu</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-islamic-green">${quotaInfo.linksGenerated}</span>
                        <span class="text-gray-400">/</span>
                        <span class="text-lg text-gray-600">${quotaInfo.plan === 'unlimited' ? '∞' : quotaInfo.maxLinks}</span>
                        <span class="text-sm text-gray-500">link digunakan</span>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Tersisa</p>
                        <p class="text-xl font-bold ${percentage >= 80 ? 'text-red-500' : 'text-islamic-green'}">${remaining} link</p>
                    </div>
                    ${quotaInfo.plan !== 'unlimited' ? `
                        <button onclick="showUpgradeModal()" class="bg-islamic-gold text-islamic-green px-4 py-2 rounded-lg font-medium hover:bg-islamic-brown hover:text-white transition text-sm">
                            <i class="fas fa-arrow-up mr-1"></i>Upgrade
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="mt-3">
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${statusColor} h-2 rounded-full transition-all" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    }
}

function hideQuotaDisplay() {
    const quotaHtml = document.getElementById('quotaDisplayContainer');
    if (quotaHtml) {
        quotaHtml.innerHTML = '';
    }
}

function getPlanBadgeClass(plan) {
    const classes = {
        'free': 'bg-gray-200 text-gray-700',
        'basic': 'bg-blue-100 text-blue-700',
        'premium': 'bg-islamic-gold/20 text-islamic-brown',
        'unlimited': 'bg-purple-100 text-purple-700'
    };
    return classes[plan] || classes['free'];
}

// Override the original loadGuests to include quota
const originalLoadGuests = loadGuests;
loadGuests = async function() {
    await loadGuestsWithQuota();
};

// =====================================================
// UPDATE INVITATION CREATION WITH PLAN
// =====================================================

// Modify the invitation form submit to include plan
const originalInvitationFormHandler = document.getElementById('invitationForm')?.onsubmit;

document.getElementById('invitationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if user can create more invitations (for free plan)
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    const userPlan = userData.plan || 'free';
    
    // Count existing invitations
    const existingInvitations = await db.collection('invitations')
        .where('userId', '==', currentUser.uid)
        .get();
    
    // Free users can only have 1 invitation
    if (userPlan === 'free' && existingInvitations.size >= 1) {
        showToast('Paket FREE hanya bisa membuat 1 undangan. Upgrade untuk membuat lebih banyak!', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const invitationId = generateInvitationId();
        
        // Get plan limits
        const maxLinks = getDefaultMaxLinks('free'); // New invitations start as free
        const duration = getDefaultDuration('free');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);
        
        const invitationData = {
            id: invitationId,
            userId: currentUser.uid,
            groom: {
                name: document.getElementById('groomName').value.trim(),
                father: document.getElementById('groomFather').value.trim(),
                mother: document.getElementById('groomMother').value.trim(),
                childOrder: document.getElementById('groomChildOrder').value.trim()
            },
            bride: {
                name: document.getElementById('brideName').value.trim(),
                father: document.getElementById('brideFather').value.trim(),
                mother: document.getElementById('brideMother').value.trim(),
                childOrder: document.getElementById('brideChildOrder').value.trim()
            },
            akad: {
                date: document.getElementById('akadDate').value,
                time: document.getElementById('akadTime').value,
                location: document.getElementById('akadLocation').value.trim()
            },
            resepsi: {
                date: document.getElementById('resepsiDate').value,
                time: document.getElementById('resepsiTime').value,
                location: document.getElementById('resepsiLocation').value.trim()
            },
            mapsLink: document.getElementById('mapsLink').value.trim(),
            specialMessage: document.getElementById('specialMessage').value.trim(),
            template: 'islamic-elegant',
            // Plan & Quota fields
            plan: 'free',
            maxLinks: maxLinks,
            linksGenerated: 0,
            expiryDate: expiryDate,
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };
        
        // Save to Firestore
        await db.collection('invitations').doc(invitationId).set(invitationData);
        
        // Update user's invitation count
        await db.collection('users').doc(currentUser.uid).update({
            invitationsCreated: firebase.firestore.FieldValue.increment(1)
        });
        
        hideLoading();
        showToast('Undangan berhasil dibuat! 🎉');
        
        // Show info about free plan limits
        alert(`Undangan berhasil dibuat!\n\nPaket: FREE\n• Kuota: ${maxLinks} link tamu\n• Aktif: ${duration} hari\n\nUpgrade kapan saja untuk menambah kuota!`);
        
        // Reset form
        document.getElementById('invitationForm').reset();
        currentStep = 1;
        document.querySelectorAll('.form-step').forEach((step, index) => {
            step.classList.toggle('hidden', index !== 0);
        });
        updateStepIndicators(1);
        
        showSection('invitations');
        
        await loadUserStats();
        await loadInvitationDropdowns();
        await loadInvitationsList();
        
    } catch (error) {
        hideLoading();
        console.error('Error saving invitation:', error);
        showToast('Gagal menyimpan undangan', 'error');
    }
});

console.log('💰 Quota system loaded successfully');