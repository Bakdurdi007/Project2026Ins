// Supabase sozlamalari
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pinInput = document.getElementById('instructorPin').value;

    // Kiritilgan qiymat aynan 4 ta raqamdan iboratligini tekshirish
    if (pinInput.length !== 4 || isNaN(pinInput)) {
        showModal({
            title: 'Xatolik',
            message: 'Iltimos, 4 xonali ID kod kiriting! (masalan: 0015)',
            type: 'error'
        });
        return;
    }

    const instructorId = parseInt(pinInput, 10);

    // Tugmani bloklaymiz va matnini o'zgartiramiz
    loginBtn.disabled = true;
    loginBtn.innerText = "Tekshirilmoqda...";
    messageDiv.innerText = "";

    try {
        // Instructors jadvalidan ID bo'yicha ma'lumotlarni olish
        const { data, error } = await _supabase
            .from('instructors')
            .select('*')
            .eq('id', instructorId)
            .single();

        if (error || !data) {
            showModal({
                title: 'Topilmadi',
                message: 'Bunday ID ga ega instruktor topilmadi!',
                type: 'error'
            });
            loginBtn.disabled = false;
            loginBtn.innerText = "Kirish";
        } else {
            // SessiYaga ma'lumotlarni saqlash
            sessionStorage.setItem('userAuthenticated', 'true');
            // Agar ism-familiyasi bo'lsa shuni, yo'qsa loginini olamiz
            sessionStorage.setItem('userName', data.full_name || data.login || `Instruktor #${data.id}`);
            sessionStorage.setItem('instructor_id', data.id);
            sessionStorage.setItem('userSource', data.source);

            // JORIY FILIAL ID SINI SAQLASH (MUHIM!)
            sessionStorage.setItem('branch_id', data.branch_id);

            messageDiv.style.color = "green";
            messageDiv.innerText = "Muvaffaqiyatli! Yo'naltirilmoqda...";

            // --- YO'NALTIRISH MANTIQI ---
            setTimeout(() => {
                if (data.source === 'hamkor') {
                    // Agar source "hamkor" bo'lsa
                    window.location.replace('clients_h.html');
                } else {
                    // Qolgan barcha holatlarda (filial)
                    window.location.replace('panel.html');
                }
            }, 1000);
        }
    } catch (err) {
        showModal({
            title: 'Tizim xatosi',
            message: 'Internet aloqasini tekshiring yoki keyinroq urinib ko\'ring.',
            type: 'error'
        });
        console.error(err);
        loginBtn.disabled = false;
        loginBtn.innerText = "Kirish";
    }
});