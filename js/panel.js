// Supabase sozlamalari (O'zingiznikini qo'ying)
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elementlari
const instructorNameElem = document.getElementById('instructorName');
const logoutBtn = document.getElementById('logoutBtn');

//1. Instructor ma'lumotlarini yuklash.
async function loadInstructorData() {
    const userLogin = sessionStorage.getItem('userName');

    const {data, error} = await _supabase
        .from('instructors')
        .select('full_name')
        .eq('login', userLogin)
        .single();
    if (data && !error) {
        instructorNameElem.innerText = data.full_name;
    } else {
        instructorNameElem.innerText = "Instructor";
    }
}

//2. QR kodni skanerlash oynasi.
const html5QrCode = new Html5Qrcode("reader");

const qrConfig = {
    fps: 10,
    qrbox: {width: 220, height: 220},
    aspectRatio: 1.0
};

// 1. QR kod skanerlanganda ishlaydigan asosiy funksiya
async function handleTicket(ticketId) {
    // Skanerni vaqtincha to'xtatib turish (ekran qotib qolishi uchun)
    // html5QrCode.pause();

    const {data, error} = await _supabase
        .from('tickets')
        .select(`
            *,
            centers:center_name ( name ),
            admins:admin_id ( admin_fullname )
        `)
        .eq('id', ticketId)
        .single();

    if (error || !data) {
        document.getElementById('result').innerText = "Xato: Ticket topilmadi!";
        document.getElementById('result').style.color = "#e74c3c";
        return;
    }

    // 1. Kamerani o'chirish va resurslarni bo'shatish
    try {
        await html5QrCode.stop(); // Skanerni to'xtatadi
    } catch (err) {
        console.warn("Kamerani to'xtatishda xatolik:", err);
    }

    // 2. Skaner kartasini (UI) butunlay yashirish
    document.querySelector('.qr-card').style.display = 'none';

    // 3. Natija oynasini ko'rsatish va ma'lumotlarni joylash
    const resultDiv = document.getElementById('ticketResult');
    resultDiv.style.display = 'block'; // Ma'lumotlar oynasini ko'rsatish

    // Natijani rasmga moslab chiqarish
    resultDiv.innerHTML = `
        <div class="ticket-header">Mashg'ulot ma'lumotlari:</div>
        
        <div class="ticket-info-row">
            <span>🔑</span> <span class="info-label">Navbat:</span> 
            <span class="token-value">${data.id || '---'}</span>
        </div>
        
        <div class="ticket-info-row">
            <span>👤</span> <span class="info-label">Ism:</span> 
            <span class="info-value">${data.full_name || 'Noma`lum'}</span>
    </div>

    <div class="ticket-info-row">
            <span>🏢</span> <span class="info-label">Markaz:</span> 
            <span class="info-value">${data.centers ? data.centers.name : 'Topilmadi'}</span>
        </div>

    <div class="ticket-info-row">
    <span>👥</span> <span class="info-label">Guruh:</span>
    <span class="info-value">${data.group || '---'}</span>
    </div>

    <div class="ticket-info-row">
    <span>📚</span> <span class="info-label">Kurs:</span>
    <span class="info-value">${data.direction_category || '---'}</span>
    </div>
    
    <div class="ticket-info-row">
    <span>💰</span> <span class="info-label">Summa:</span>
    <span class="info-value">${data.payment_amount || '0'} so'm</span>
    </div>

    <div class="ticket-info-row">
    <span>⌛</span> <span class="info-label">Vaqt:</span>
    <span class="info-value">${data.minute || '---'} min</span>
    </div>

    <div class="ticket-info-row">
    <span>📅</span> <span class="info-label">Sana:</span>
    <span class="info-value">${new Date(data.created_at).toLocaleString('uz-UZ')}</span>
    </div>
    
    <div class="ticket-info-row">
            <span>👨‍💻</span> <span class="info-label">Admin:</span>
            <span class="info-value">${data.admins ? data.admins.admin_fullname : 'Noma\'lum'}</span>
    </div>

    <button class="start-btn" onclick="startLesson('${data.id}')">
    ▶ Mashg'ulotni boshlash
    </button>
    `;
}

// 2. Kamerani ishga tushirish
html5QrCode.start(
    {facingMode: "environment"},
    qrConfig,
    (decodedText) => {
        // QR kod o'qilishi bilan bazadan qidirishni boshlaymiz
        handleTicket(decodedText);
        console.log("Skanerlandi:", decodedText);
    },
    (errorMessage) => {
        // Skanerlash davom etmoqda...
    }
).catch((err) => {
    document.getElementById('result').innerText = "Kameraga ruxsat berilmadi!";
    console.error(err);
});

// 3. Mashg'ulotni boshlash tugmasi uchun funksiya
async function startLesson(id) {
    alert("Mashg'ulot boshlandi! ID: " + id);
    // Bu yerda ticket statusini 'active' qilib yangilashingiz mumkin
}


//0. Chiqish funksiyasi
logoutBtn.addEventListener('click', () => {
    if (confirm("Tizimdan chiqmoqchimisiz?")) {
        sessionStorage.clear();
        window.location.replace('index.html');
    }
});

// Sahifa yuklanganda ishga tushadi
loadInstructorData();