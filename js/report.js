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
        // 1. Vaqt chegaralarini belgilaymiz
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const last7Days = new Date();
        last7Days.setDate(now.getDate() - 7);
        const startOfWeekly = last7Days.toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // 2. Bazadan aynan shu instruktorning cheklarini limitni yengib to'liq olish (Pagination)
        let allTickets = [];
        let isFetching = true;
        let from = 0;
        const step = 999;

        while (isFetching) {
            const { data, error: tError } = await _supabase
                .from('tickets')
                .select('actual_minute, lesson_stop_time')
                .eq('instructor_id', instId)
                .gte('lesson_stop_time', startOfYear) // Faqat joriy yil ma'lumotlari kerak
                .range(from, from + step);

            if (tError) throw new Error("Cheklarni yuklashda xatolik");

            allTickets = allTickets.concat(data);

            // Agar kelgan ma'lumot step (1000) dan kam bo'lsa, demak hammasini oldik
            if (data.length <= step) {
                isFetching = false;
            } else {
                from += step + 1;
            }
        }

        // 3. Instruktor ma'lumotini olish (stavka va source uchun)
        const { data: instructor, error: iError } = await _supabase
            .from('instructors')
            .select('source, id')
            .eq('id', instId)
            .single();

        if (iError) throw new Error("Instruktor ma'lumotini yuklashda xatolik");

        // Stavkalarni belgilaymiz (Admin panel bilan bir xil bo'lishi kerak)
        const MIN_RATE = 40000; // 12000 min gacha
        const MAX_RATE = 45000; // 12000 min dan oshsa

        // Yordamchi hisoblash funksiyasi
        const calculateStats = (filteredTickets) => {
            const totalMin = filteredTickets.reduce((sum, t) => sum + (t.actual_minute || 0), 0);
            let salary = 0;
            if (totalMin > 0 && totalMin <= 12000) {
                salary = (totalMin / 60) * MIN_RATE;
            } else if (totalMin > 12000) {
                salary = (totalMin / 60) * MAX_RATE;
            }
            return { min: totalMin, money: Math.floor(salary) };
        };

        // 4. Har bir vaqt oralig'i uchun ma'lumotlarni filtrlash va hisoblash
        const daily = calculateStats(allTickets.filter(t => t.lesson_stop_time >= startOfDay));
        const weekly = calculateStats(allTickets.filter(t => t.lesson_stop_time >= startOfWeekly));
        const monthly = calculateStats(allTickets.filter(t => t.lesson_stop_time >= startOfMonth));
        const annual = calculateStats(allTickets);

        // 5. Global keshga saqlaymiz
        cachedReportData = {
            daily_minute: daily.min,
            daily_money: daily.money,
            weekly_minute: weekly.min,
            weekly_money: weekly.money,
            monthly_minute: monthly.min,
            monthly_money: monthly.money,
            annual_minute: annual.min,
            annual_money: annual.money,
            cashback_money: 0 // Agar bazada cashback bo'lsa, bu yerga ulanadi
        };

        cachedInstructorSource = instructor.source;

        // Birinchi bo'lib kunlik hisobotni ko'rsatish
        renderReport('daily');

    } catch (err) {
        console.error("Xatolik:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">Ma'lumotlarni hisoblashda xatolik yuz berdi.</p>`;
    }
}

function renderReport(type) {
    const container = document.getElementById('reportContainer');
    if (!cachedReportData) return;

    let title, min, money;

    switch(type) {
        case 'daily':
            title = 'Bugungi Hisobot';
            min = cachedReportData.daily_minute;
            money = cachedReportData.daily_money;
            break;
        case 'weekly':
            title = 'Oxirgi 7 kunlik';
            min = cachedReportData.weekly_minute;
            money = cachedReportData.weekly_money;
            break;
        case 'monthly':
            title = 'Shu oylik hisobot';
            min = cachedReportData.monthly_minute;
            money = cachedReportData.monthly_money;
            break;
        case 'annual':
            title = 'Yillik jami hisobot';
            min = cachedReportData.annual_minute;
            money = cachedReportData.annual_money;
            break;
    }

    let html = createCard(title, min, money);

    if (cachedInstructorSource === 'hamkor') {
        html += `
            <div class="report-card cashback-card">
                <h3>🎁 Cashback Hisoboti</h3>
                <div class="stat-row">
                    <span class="stat-label"><i class="fa-solid fa-gift"></i> Jamg'arma:</span>
                    <span class="stat-val money">${(cachedReportData.cashback_money || 0).toLocaleString()} so'm</span>
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
            <!--
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-wallet"></i> Daromad:</span>
                <span class="stat-val money">${(money || 0).toLocaleString()} so'm</span>
            </div>
            -->
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