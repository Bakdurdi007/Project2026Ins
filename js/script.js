// Supabase sozlamalari (O'zingiznikini qo'ying)
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
        messageDiv.innerText = "Iltimos, 4 xonali kod kiriting! (masalan: 0012)";
        return;
    }

    // '0015' kabi yozuvni son formatiga (15) o'tkazamiz
    const instructorId = parseInt(pinInput, 10);
    messageDiv.innerText = "Tekshirilmoqda..."; // Yuklanish jarayoni

    // Instructors jadvalidan ID bo'yicha tekshirish
    const { data, error } = await _supabase
        .from('instructors')
        .select('*')
        .eq('id', instructorId)
        .single();

    if (error || !data) {
        messageDiv.innerText = "Bunday ID ga ega instruktor topilmadi!";
    } else {
        // Muvaffaqiyatli kirish
        sessionStorage.setItem('userAuthenticated', 'true');
        // Agar bazangizda ism-sharif maydoni bo'lsa (masalan 'full_name'), uni ham saqlang
        sessionStorage.setItem('userName', data.login || `Instructor #${data.id}`);
        sessionStorage.setItem('instructor_id', data.id);

        messageDiv.style.color = "green";
        messageDiv.innerText = "Muvaffaqiyatli! Yo'naltirilmoqda...";
        window.location.replace('panel.html');
    }
});