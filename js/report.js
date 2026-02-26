const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global o'zgaruvchilar - ma'lumotni saqlab turish uchun
let cachedReportData = null;
let cachedInstructorSource = null;

document.addEventListener('DOMContentLoaded', () => {
    loadReports();
    setupTabs();
});

async function loadReports() {
    const instId = sessionStorage.getItem('instructor_id');
    const container = document.getElementById('reportContainer');

    try {
        // 1. Reports ma'lumotlarini olish
        const { data: report, error: rError } = await _supabase
            .from('reports')
            .select('*')
            .eq('instructor_id', instId)
            .single();

        // 2. Instructor ma'lumotlarini olish
        const { data: instructor, error: iError } = await _supabase
            .from('instructors')
            .select('source')
            .eq('id', instId)
            .single();

        if (rError || iError) throw new Error("Ma'lumot topilmadi");

        // Kelgan datalarni global o'zgaruvchiga saqlaymiz
        cachedReportData = report;
        cachedInstructorSource = instructor.source;

        // Boshlang'ich holatda 1 kunlik va Cashbackni chizib berish
        renderReport('daily');

    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">Xatolik yuz berdi yoki ma'lumot mavjud emas.</p>`;
    }
}

function renderReport(type) {
    const container = document.getElementById('reportContainer');

    // Agar data hali kelmagan bo'lsa, hech narsa qilmaydi
    if (!cachedReportData) return;

    let title, min, money;

    // Tugma turiga qarab kerakli ma'lumotlarni ajratib olamiz
    switch(type) {
        case 'daily':
            title = '1 Kunlik Hisobot';
            min = cachedReportData.daily_minute;
            money = cachedReportData.daily_money;
            break;
        case 'weekly':
            title = '1 Haftalik Hisobot';
            min = cachedReportData.weekly_minute;
            money = cachedReportData.weekly_money;
            break;
        case 'monthly':
            title = '1 Oylik Hisobot';
            min = cachedReportData.monthly_minute;
            money = cachedReportData.monthly_money;
            break;
        case 'annual':
            title = '1 Yillik Hisobot';
            min = cachedReportData.annual_minute;
            money = cachedReportData.annual_money;
            break;
    }

    // Tanlangan vaqt hisobotini yaratamiz
    let html = createCard(title, min, money);

    // Cashback doim chiqib turadi (agar instructor "hamkor" bo'lsa)
    if (cachedInstructorSource === 'hamkor') {
        html += `
            <div class="report-card cashback-card">
                <h3>🎁 Cashback Hisoboti</h3>
                <div class="stat-row">
                    <span class="stat-label"><i class="fa-solid fa-gift"></i> Jamg'arma:</span>
                    <span class="stat-val money">${cachedReportData.cashback_money.toLocaleString()} so'm</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function createCard(title, min, money) {
    return `
        <div class="report-card">
            <h3>${title}</h3>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-clock"></i> Ish vaqti:</span>
                <span class="stat-val">${min || 0} min</span>
            </div>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-wallet"></i> Daromad:</span>
                <span class="stat-val money">${(money || 0).toLocaleString()} so'm</span>
            </div>
        </div>
    `;
}

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
            renderReport(selectedType);
        });
    });
}

loadReports();