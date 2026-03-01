const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    // Sahifa yuklanganda standart '1 kunlik' ma'lumotni chaqiramiz
    fetchAndRenderData('daily');
});

// Tugmalarni eshitish (Click events)
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Oldingi faol tugmadan .active classni olib tashlaymiz
            tabs.forEach(t => t.classList.remove('active'));

            // Bosilgan tugmaga .active class qo'shamiz
            e.target.classList.add('active');

            // data-type atributini olib (daily, weekly, vs) ekranni yangilaymiz
            const selectedType = e.target.getAttribute('data-type');
            fetchAndRenderData(selectedType);
        });
    });
}

async function fetchAndRenderData(periodType) {
    const instId = sessionStorage.getItem('instructor_id');
    const container = document.getElementById('reportContainer');

    // Yuklanmoqda holatini ko'rsatish
    container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Ma\'lumotlar hisoblanmoqda...</p>';

    if (!instId) {
        container.innerHTML = `<p style="color:red; text-align:center;">Foydalanuvchi (Instructor ID) topilmadi.</p>`;
        return;
    }

    // Boshlanish sanasini hisoblash
    const now = new Date();
    let startDate = new Date();

    switch (periodType) {
        case 'daily':
            startDate.setDate(now.getDate() - 1);
            break;
        case 'weekly':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'annual':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
    }

    try {
        // Supabase'dan partner jadvalidagi ma'lumotlarni tortish
        // 'start_time' o'rniga o'zingizdagi vaqt ustunini yozishingiz mumkin (masalan, created_at)
        const { data, error } = await _supabase
            .from('partner')
            .select('estimated_time')
            .eq('instructor_id', instId)
            .gte('start_time', startDate.toISOString());

        if (error) throw error;

        // O'quvchilar soni (kelgan qatorlar soni)
        const studentsCount = data.length;

        // Barcha estimated_time larni qo'shib chiqish
        const totalMinutes = data.reduce((sum, item) => sum + (item.estimated_time || 0), 0);

        // HTML ga chizish
        renderCard(periodType, studentsCount, totalMinutes);

    } catch (err) {
        console.error("Xatolik:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">Ma'lumotlarni yuklashda xatolik yuz berdi.</p>`;
    }
}

function renderCard(type, studentsCount, totalMinutes) {
    const container = document.getElementById('reportContainer');

    let title = '';
    switch(type) {
        case 'daily': title = '1 Kunlik Hisobot'; break;
        case 'weekly': title = '1 Haftalik Hisobot'; break;
        case 'monthly': title = '1 Oylik Hisobot'; break;
        case 'annual': title = '1 Yillik Hisobot'; break;
    }

    // Yangi kartochka strukturasi
    const html = `
        <div class="report-card">
            <h3>${title}</h3>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-clock"></i> Jami vaqt:</span>
                <span class="stat-val">${totalMinutes} min</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}