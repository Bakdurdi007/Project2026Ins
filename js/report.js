// Supabase sozlamalari
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let cachedReportData = null;
let cachedInstructorSource = null;

document.addEventListener('DOMContentLoaded', () => {
    loadReports();
    setupTabs();
});

async function loadReports() {
    const instId = sessionStorage.getItem('instructor_id');
    const branchId = sessionStorage.getItem('branch_id'); // Filialni olamiz
    const container = document.getElementById('reportContainer');

    if (!instId || !branchId) {
        container.innerHTML = `<p style="color:orange; text-align:center;">Sessiya topilmadi. Qayta kiring.</p>`;
        return;
    }

    try {
        // 1. Vaqt chegaralarini belgilash
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const last7Days = new Date();
        last7Days.setDate(now.getDate() - 7);
        const startOfWeekly = last7Days.toISOString();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // 2. Chiptalarni olish (Faqat shu instruktor va SHU FILIAL uchun)
        const { data: tickets, error: tError } = await _supabase
            .from('tickets')
            .select('actual_minute, lesson_stop_time, payment_amount')
            .eq('instructor_id', instId)
            .eq('branch_id', branchId) // MUHIM: Filial filtri
            .not('lesson_stop_time', 'is', null);

        // 3. Instruktor va uning umumiy hisoboti (Cashback uchun)
        const { data: instructor, error: iError } = await _supabase
            .from('instructors')
            .select('source')
            .eq('id', instId)
            .single();

        // SQLda yaratgan reports jadvalidan joriy cashbackni olamiz
        const { data: reportTable } = await _supabase
            .from('reports')
            .select('cashback_money')
            .eq('instructor_id', instId)
            .eq('branch_id', branchId) // Faqat shu filialdagi cashback
            .single();

        if (tError || iError) throw new Error("Ma'lumot yuklashda xatolik");

        const MIN_RATE = 40000;
        const MAX_RATE = 45000;

        const calculateStats = (filteredTickets) => {
            const totalMin = filteredTickets.reduce((sum, t) => sum + (t.actual_minute || 0), 0);
            let salary = 0;
            // Sizning mantiqingiz bo'yicha hisoblaymiz
            if (totalMin > 0 && totalMin <= 12000) {
                salary = (totalMin / 60) * MIN_RATE;
            } else if (totalMin > 12000) {
                salary = (totalMin / 60) * MAX_RATE;
            }
            return { min: totalMin, money: salary };
        };

        // 4. Filtrlash va hisoblash
        const daily = calculateStats(tickets.filter(t => t.lesson_stop_time >= startOfDay));
        const weekly = calculateStats(tickets.filter(t => t.lesson_stop_time >= startOfWeekly));
        const monthly = calculateStats(tickets.filter(t => t.lesson_stop_time >= startOfMonth));
        const annual = calculateStats(tickets.filter(t => t.lesson_stop_time >= startOfYear));

        // 5. Keshga saqlash
        cachedReportData = {
            daily_minute: daily.min,
            daily_money: daily.money,
            weekly_minute: weekly.min,
            weekly_money: weekly.money,
            monthly_minute: monthly.min,
            monthly_money: monthly.money,
            annual_minute: annual.min,
            annual_money: annual.money,
            cashback_money: reportTable ? reportTable.cashback_money : 0
        };

        cachedInstructorSource = instructor.source;
        renderReport('daily');

    } catch (err) {
        console.error("Xatolik:", err);
        container.innerHTML = `<p style="color:red; text-align:center;">Hisobotlarni shakllantirishda xatolik.</p>`;
    }
}

function renderReport(type) {
    const container = document.getElementById('reportContainer');
    if (!cachedReportData) return;

    let title, min, money;

    switch(type) {
        case 'daily': title = 'Bugungi Hisobot'; min = cachedReportData.daily_minute; money = cachedReportData.daily_money; break;
        case 'weekly': title = 'Oxirgi 7 kunlik'; min = cachedReportData.weekly_minute; money = cachedReportData.weekly_money; break;
        case 'monthly': title = 'Shu oylik hisobot'; min = cachedReportData.monthly_minute; money = cachedReportData.monthly_money; break;
        case 'annual': title = 'Yillik jami hisobot'; min = cachedReportData.annual_minute; money = cachedReportData.annual_money; break;
    }

    let html = createCard(title, min, money);

    // Agar instruktor 'hamkor' bo'lsa cashbackni chiqaramiz
    if (cachedInstructorSource === 'hamkor') {
        html += `
            <div class="report-card cashback-card" style="margin-top: 15px; border-left: 5px solid #27ae60;">
                <h3 style="color: #27ae60;"><i class="fa-solid fa-gift"></i> Cashback Hisoboti</h3>
                <div class="stat-row">
                    <span class="stat-label">Filial bo'yicha jamg'arma:</span>
                    <span class="stat-val money" style="color: #27ae60; font-size: 1.2rem;">${(cachedReportData.cashback_money || 0).toLocaleString()} so'm</span>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function createCard(title, min, money) {
    return `
        <div class="report-card" style="border-left: 5px solid #3498db;">
            <h3>${title}</h3>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-clock"></i> Ish vaqti:</span>
                <span class="stat-val">${min || 0} min</span>
            </div>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-wallet"></i> Taxminiy daromad:</span>
                <span class="stat-val money" style="color: #2980b9;">${Math.floor(money || 0).toLocaleString()} so'm</span>
            </div>
        </div>
    `;
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderReport(e.target.getAttribute('data-type'));
        });
    });
}