// Supabase sozlamalari
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pinInput = document.getElementById('instructorPin').value;

    // Kiritilgan qiymat aynan 4 ta raqamdan iboratligini tekshirish
    if (pinInput.length !== 4 || isNaN(pinInput)) {
        messageDiv.style.color = "red";
        messageDiv.innerText = "Iltimos, 4 xonali kod kiriting! (masalan: 0015)";
        return;
    }

    const instructorId = parseInt(pinInput, 10);
    messageDiv.style.color = "orange";
    messageDiv.innerText = "Tekshirilmoqda...";

    try {
        // Instructors jadvalidan ID bo'yicha ma'lumotlarni olish
        const { data, error } = await _supabase
            .from('instructors')
            .select('*')
            .eq('id', instructorId)
            .single();

        if (error || !data) {
            messageDiv.style.color = "red";
            messageDiv.innerText = "Bunday ID ga ega instruktor topilmadi!";
        } else {
            // Sessiyaga ma'lumotlarni saqlash
            sessionStorage.setItem('userAuthenticated', 'true');
            sessionStorage.setItem('userName', data.login || `Instructor #${data.id}`);
            sessionStorage.setItem('instructor_id', data.id);
            sessionStorage.setItem('userSource', data.source); // Source qiymatini ham saqlab qo'yamiz

            messageDiv.style.color = "green";
            messageDiv.innerText = "Muvaffaqiyatli! Yo'naltirilmoqda...";

            // --- YO'NALTIRISH MANTIQI ---
            if (data.source === 'hamkor') {
                // Agar source "hamkor" bo'lsa
                window.location.replace('clients_h.html');
            } else if (data.source === 'filial') {
                // Agar source "filial" bo'lsa
                window.location.replace('panel.html');
            } else {
                // Agar source kutilmagan boshqa qiymat bo'lsa (ehtiyot chorasi)
                window.location.replace('panel.html');
            }
        }
    } catch (err) {
        messageDiv.style.color = "red";
        messageDiv.innerText = "Tizimda xatolik yuz berdi.";
        console.error(err);
    }
});