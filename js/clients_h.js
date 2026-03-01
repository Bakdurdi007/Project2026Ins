const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Sanani chiroyli formatlash funksiyasi (DD.MM.YYYY HH:MM)
function formatDate(dateString) {
    if (!dateString) return '---';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

async function loadClients(period, btnElement) {
    // Tugmalardagi "active" klassini o'zgartirish
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Ma'lumotlar yuklanmoqda...</td></tr>`;

    // Agar sizga hali ham instructor_id bo'yicha filter kerak bo'lsa, buni qoldiramiz.
    // Agar partner jadvalida bu ustun bo'lmasa, uni olib tashlashingiz mumkin.
    const instId = sessionStorage.getItem('instructor_id');
    if (!instId) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Foydalanuvchi ID topilmadi.</td></tr>`;
        return;
    }

    // Boshlanish sanasini hisoblash
    const now = new Date();
    let startDate = new Date();

    if (period === 'day') startDate.setDate(now.getDate() - 1);
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    try {
        // Supabase'dan ma'lumotlarni tortish (partner jadvalidan)
        // start_time orqali filter qilinmoqda
        const {data, error} = await _supabase
            .from('partner')
            .select('start_time, stop_time, estimated_time')
            .eq('instructor_id', instId) // Agar partner jadvalida bu ustun bo'lmasa, bu qatorni o'chiring
            .not('start_time', 'is', null)
            .gte('start_time', startDate.toISOString())
            .order('start_time', {ascending: false});

        if (error) throw error;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Ushbu davrda ma'lumotlar topilmadi.</td></tr>`;
            return;
        }

        // Ma'lumotlarni HTML jadvaliga joylash
        let html = '';
        data.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td style="font-weight: 500; color: var(--text-gray);">${formatDate(item.start_time)}</td>
                    <td style="color: var(--text-gray);">${formatDate(item.stop_time)}</td>
                    <td><span class="minute-badge">${item.estimated_time || 0}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (err) {
        console.error("Supabase xatosi: ", err);
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: #e74c3c;">Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.</td></tr>`;
    }
}

// Sahifa yuklanganda standart '1 kunlik' ma'lumotlarni chaqiramiz
document.addEventListener('DOMContentLoaded', () => {
    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn) {
        loadClients('day', activeBtn);
    }
});