const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

        // 2. Instructor ma'lumotlarini olish (source va cashback uchun)
        const { data: instructor, error: iError } = await _supabase
            .from('instructors')
            .select('source')
            .eq('id', instId)
            .single();

        if (rError || iError) throw new Error("Ma'lumot topilmadi");

        let html = `
            ${createCard('1 Kunlik Hisobot', report.daily_minute, report.daily_money)}
            ${createCard('1 Haftalik Hisobot', report.weekly_minute, report.weekly_money)}
            ${createCard('1 Oylik Hisobot', report.monthly_minute, report.monthly_money)}
            ${createCard('1 Yillik Hisobot', report.annual_minute, report.annual_money)}
        `;

        // Cashback faqat 'hamkor' bo'lsa ko'rinadi
        if (instructor.source === 'hamkor') {
            html += `
                <div class="report-card cashback-card">
                    <h3>🎁 Cashback Hisoboti</h3>
                    <div class="stat-row">
                        <span class="stat-label"><i class="fa-solid fa-gift"></i> Jamg'arma:</span>
                        <span class="stat-val money">${report.cashback_money.toLocaleString()} so'm</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">Xatolik yuz berdi yoki ma'lumot mavjud emas.</p>`;
    }
}

function createCard(title, min, money) {
    return `
        <div class="report-card">
            <h3>${title}</h3>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-clock"></i> Ish vaqti:</span>
                <span class="stat-val">${min} min</span>
            </div>
            <div class="stat-row">
                <span class="stat-label"><i class="fa-solid fa-wallet"></i> Daromad:</span>
                <span class="stat-val money">${money.toLocaleString()} so'm</span>
            </div>
        </div>
    `;
}

loadReports();