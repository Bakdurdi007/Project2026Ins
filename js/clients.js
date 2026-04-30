// Supabase sozlamalari
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
    // 1. Tugmalardagi "active" klassini boshqarish
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Ma'lumotlar yuklanmoqda...</td></tr>`;

    // 2. Sessiyadan kerakli IDlarni olish
    const instId = sessionStorage.getItem('instructor_id');
    const branchId = sessionStorage.getItem('branch_id'); // Filial filtri uchun

    if (!instId || !branchId) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Tizimga qayta kiring!</td></tr>`;
        return;
    }

    // 3. Vaqt oralig'ini hisoblash
    const now = new Date();
    let startDate = new Date();

    // Filtrlash mantiqi:
    if (period === 'day') startDate.setHours(0, 0, 0, 0); // Bugungi kun boshidan
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    try {
        // 4. Supabase'dan ma'lumotlarni tortish
        const { data, error } = await _supabase
            .from('tickets')
            .select('full_name, lesson_stop_time, actual_minute')
            .eq('instructor_id', instId)
            .eq('branch_id', branchId) // MUHIM: Faqat shu filialga tegishli chiptalar
            .not('lesson_stop_time', 'is', null) // Faqat tugatilgan darslar
            .gte('lesson_stop_time', startDate.toISOString())
            .order('lesson_stop_time', { ascending: false });

        if (error) throw error;

        // 5. Ma'lumot yo'qligini tekshirish
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Ushbu davrda darslar topilmadi.</td></tr>`;
            return;
        }

        // 6. HTML jadvalini shakllantirish
        let html = '';
        data.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td style="font-weight: 500;">${item.full_name || 'Noma\'lum'}</td>
                    <td style="color: #7f8c8d; font-size: 0.85rem;">${formatDate(item.lesson_stop_time)}</td>
                    <td><span class="minute-badge">${item.actual_minute || 0} min</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (err) {
        console.error("Yuklashda xatolik:", err);
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: #e74c3c;">Ma'lumotlarni yuklab bo'lmadi.</td></tr>`;

        // Universal modal orqali xatolikni ko'rsatish
        if (typeof showModal === "function") {
            showModal({
                title: 'Xatolik',
                message: 'Ma\'lumotlarni olishda muammo yuz berdi. Internetni tekshiring.',
                type: 'error'
            });
        }
    }
}

// Sahifa yuklanganda 'day' (bugungi) ma'lumotlarni yuklaymiz
document.addEventListener('DOMContentLoaded', () => {
    const activeBtn = document.querySelector('.filter-btn.active') || document.querySelector('.filter-btn');
    loadClients('day', activeBtn);
});