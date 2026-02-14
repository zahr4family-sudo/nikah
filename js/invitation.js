// js/invitation.js
// =====================================================
// INVITATION PAGE FUNCTIONALITY
// =====================================================

let invitationData = null;
let guestName = 'Tamu Undangan';
let invitationId = null;
let isMusicPlaying = false;

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize AOS
    AOS.init({
        once: true,
        duration: 800,
        offset: 100
    });
    
    // Get URL parameters
    invitationId = getUrlParameter('id');
    const encodedGuestName = getUrlParameter('to');
    
    if (encodedGuestName) {
        guestName = decodeGuestName(encodedGuestName);
    }
    
    // Display guest name on cover
    document.getElementById('guestNameDisplay').textContent = guestName;
    
    // Pre-fill RSVP name
    document.getElementById('rsvpName').value = guestName !== 'Tamu Undangan' ? guestName : '';
    
    // Load invitation data
    if (invitationId) {
        await loadInvitationData();
    }
});

// =====================================================
// LOAD INVITATION DATA
// =====================================================
async function loadInvitationData() {
    try {
        const doc = await db.collection('invitations').doc(invitationId).get();
        
        if (!doc.exists) {
            console.error('Invitation not found');
            return;
        }
        
        invitationData = doc.data();
        
        // Populate all fields
        populateInvitation();
        
        // Start countdown
        startCountdown();
        
        // Load wishes
        loadWishes();
        
    } catch (error) {
        console.error('Error loading invitation:', error);
    }
}

function populateInvitation() {
    if (!invitationData) return;
    
    // Cover section
    document.getElementById('coverGroomName').textContent = invitationData.groom?.name || 'Mempelai Pria';
    document.getElementById('coverBrideName').textContent = invitationData.bride?.name || 'Mempelai Wanita';
    
    // Couple section - Groom
    document.getElementById('groomFullName').textContent = invitationData.groom?.name || 'Mempelai Pria';
    document.getElementById('groomChildInfo').textContent = `Putra ${invitationData.groom?.childOrder || 'Pertama'} dari`;
    document.getElementById('groomParents').textContent = 
        `Bapak ${invitationData.groom?.father || '-'} & Ibu ${invitationData.groom?.mother || '-'}`;
    
    // Couple section - Bride
    document.getElementById('brideFullName').textContent = invitationData.bride?.name || 'Mempelai Wanita';
    document.getElementById('brideChildInfo').textContent = `Putri ${invitationData.bride?.childOrder || 'Pertama'} dari`;
    document.getElementById('brideParents').textContent = 
        `Bapak ${invitationData.bride?.father || '-'} & Ibu ${invitationData.bride?.mother || '-'}`;
    
    // Akad section
    if (invitationData.akad) {
        document.getElementById('akadDateDisplay').textContent = formatDateIndonesian(invitationData.akad.date);
        document.getElementById('akadTimeDisplay').textContent = `${invitationData.akad.time} WIB - Selesai`;
        document.getElementById('akadLocationDisplay').innerHTML = invitationData.akad.location?.replace(/\n/g, '<br>') || '-';
    }
    
    // Resepsi section
    if (invitationData.resepsi) {
        document.getElementById('resepsiDateDisplay').textContent = formatDateIndonesian(invitationData.resepsi.date);
        document.getElementById('resepsiTimeDisplay').textContent = `${invitationData.resepsi.time} WIB - Selesai`;
        document.getElementById('resepsiLocationDisplay').innerHTML = invitationData.resepsi.location?.replace(/\n/g, '<br>') || '-';
    }
    
    // Maps button
    if (invitationData.mapsLink) {
        document.getElementById('mapsButton').href = invitationData.mapsLink;
    }
    
    // Special message
    if (invitationData.specialMessage) {
        document.getElementById('specialMessageDisplay').textContent = invitationData.specialMessage;
    }
    
    // Footer names
    document.getElementById('footerGroomName').textContent = invitationData.groom?.name?.split(' ')[0] || 'Mempelai Pria';
    document.getElementById('footerBrideName').textContent = invitationData.bride?.name?.split(' ')[0] || 'Mempelai Wanita';
    
    // Update page title
    document.title = `Undangan ${invitationData.groom?.name} & ${invitationData.bride?.name} | NikahKu`;
}

// =====================================================
// OPEN INVITATION (Envelope Animation)
// =====================================================
function openInvitation() {
    // Hide cover section with animation
    const coverSection = document.getElementById('coverSection');
    coverSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    coverSection.style.opacity = '0';
    coverSection.style.transform = 'translateY(-50px)';
    
    setTimeout(() => {
        coverSection.style.display = 'none';
        
        // Show main content
        const mainContent = document.getElementById('mainContent');
        mainContent.classList.remove('hidden');
        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            mainContent.style.opacity = '1';
        }, 50);
        
        // Auto play music
        playMusic();
        
        // Reinitialize AOS for newly visible elements
        AOS.refresh();
    }, 500);
}

// =====================================================
// COUNTDOWN TIMER
// =====================================================
function startCountdown() {
    if (!invitationData?.akad?.date) return;
    
    const eventDate = new Date(`${invitationData.akad.date}T${invitationData.akad.time || '08:00'}`);
    
    function updateCountdown() {
        const now = new Date();
        const diff = eventDate - now;
        
        if (diff <= 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// =====================================================
// MUSIC CONTROL
// =====================================================
function toggleMusic() {
    if (isMusicPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

function playMusic() {
    const audio = document.getElementById('bgMusic');
    const musicBtn = document.getElementById('musicBtn');
    const musicIcon = document.getElementById('musicIcon');
    
    audio.play().then(() => {
        isMusicPlaying = true;
        musicIcon.classList.remove('fa-volume-mute');
        musicIcon.classList.add('fa-volume-up');
        musicBtn.classList.add('playing');
    }).catch(error => {
        console.log('Autoplay prevented:', error);
    });
}

function pauseMusic() {
    const audio = document.getElementById('bgMusic');
    const musicBtn = document.getElementById('musicBtn');
    const musicIcon = document.getElementById('musicIcon');
    
    audio.pause();
    isMusicPlaying = false;
    musicIcon.classList.remove('fa-volume-up');
    musicIcon.classList.add('fa-volume-mute');
    musicBtn.classList.remove('playing');
}

// =====================================================
// RSVP FORM
// =====================================================
document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('rsvpName').value.trim();
    const attendance = document.querySelector('input[name="attendance"]:checked')?.value;
    const guestCount = document.getElementById('guestCount').value;
    const message = document.getElementById('rsvpMessage').value.trim();
    
    if (!name || !attendance) {
        alert('Mohon lengkapi form RSVP');
        return;
    }
    
    try {
        // Check if guest exists in invitation
        const guestsRef = db.collection('invitations').doc(invitationId).collection('guests');
        const guestQuery = await guestsRef.where('name', '==', name).get();
        
        if (guestQuery.empty) {
            // Add new guest with RSVP
            await guestsRef.add({
                name: name,
                phone: '',
                rsvpStatus: attendance === 'hadir' ? 'confirmed' : 'declined',
                guestCount: parseInt(guestCount),
                message: message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                rsvpAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update existing guest
            const guestDoc = guestQuery.docs[0];
            await guestDoc.ref.update({
                rsvpStatus: attendance === 'hadir' ? 'confirmed' : 'declined',
                guestCount: parseInt(guestCount),
                message: message,
                rsvpAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Add to wishes if message exists
        if (message) {
            await db.collection('invitations').doc(invitationId).collection('wishes').add({
                name: name,
                message: message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Reload wishes
            loadWishes();
        }
        
        // Show success message
        document.getElementById('rsvpForm').classList.add('hidden');
        document.getElementById('rsvpSuccess').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error submitting RSVP:', error);
        alert('Gagal mengirim konfirmasi. Silakan coba lagi.');
    }
});

// =====================================================
// LOAD WISHES
// =====================================================
async function loadWishes() {
    if (!invitationId) return;
    
    try {
        const snapshot = await db.collection('invitations')
            .doc(invitationId)
            .collection('wishes')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (snapshot.empty) {
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const wish = doc.data();
            const initial = wish.name?.charAt(0)?.toUpperCase() || '?';
            const timeAgo = wish.createdAt ? getTimeAgo(wish.createdAt.toDate()) : '';
            
            html += `
                <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" data-aos="fade-up">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-islamic-gold rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="text-islamic-green font-bold">${initial}</span>
                        </div>
                        <div>
                            <p class="font-semibold text-white">${wish.name}</p>
                            <p class="text-white/70 mt-1">${wish.message}</p>
                            <p class="text-white/50 text-sm mt-2">${timeAgo}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('wishesList').innerHTML = html;
        AOS.refresh();
        
    } catch (error) {
        console.error('Error loading wishes:', error);
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID');
}

console.log('💒 Invitation.js loaded successfully');