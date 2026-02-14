// Add this to dashboard.js or create separate file

export async function exportGuestsToExcel(userId) {
    try {
        const guestsRef = collection(db, 'weddings', userId, 'guests');
        const q = query(guestsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('Tidak ada data tamu untuk di-export');
            return;
        }
        
        // Prepare data
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No,Nama,No. WhatsApp,Status,Kehadiran,Jumlah Tamu,Dibuka,Konfirmasi\n";
        
        let no = 1;
        querySnapshot.forEach(doc => {
            const guest = doc.data();
            const row = [
                no++,
                guest.name,
                guest.phone || '-',
                guest.confirmed ? 'Konfirmasi' : (guest.opened ? 'Dibuka' : 'Pending'),
                guest.attendance || '-',
                guest.guestCount || '-',
                guest.openedAt ? new Date(guest.openedAt.toDate()).toLocaleDateString('id-ID') : '-',
                guest.confirmedAt ? new Date(guest.confirmedAt.toDate()).toLocaleDateString('id-ID') : '-'
            ].join(',');
            csvContent += row + "\n";
        });
        
        // Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `daftar_tamu_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('✅ Data tamu berhasil di-export!');
        
    } catch (error) {
        console.error('Error exporting:', error);
        alert('❌ Gagal export data: ' + error.message);
    }
}