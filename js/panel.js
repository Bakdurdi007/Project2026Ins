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
html5QrCode.start({facingMode: "environment"},qrConfig, (decodedText) => {
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
// Taymer o'zgaruvchisi (global)
let lessonTimer;

async function startLesson(ticketId) {
    const startBtn = document.querySelector('.start-btn');
    const resultDiv = document.getElementById('result'); // Ma'lumotlar chiqadigan oyna
    const currentInstId = sessionStorage.getItem('instructor_id');

    if (!currentInstId) {
        alert("Xatolik: Instruktor aniqlanmadi.");
        return;
    }

    startBtn.disabled = true;
    startBtn.innerText = "Bajarilmoqda...";

    try {
        // 1. RPC orqali barcha amallarni bajarish va ma'lumotlarni olish
        const { data, error } = await _supabase.rpc('start_lesson_complete', {
            chek_id: parseInt(ticketId),
            current_instructor_id: parseInt(currentInstId)
        });

        if (error) throw error;

        // Ma'lumotlarni olamiz (data massiv qaytadi)
        const { lesson_minutes, instructor_car_number } = data[0];

        // 2. UI ni Taymerga almashtirish
        resultDiv.innerHTML = `
            <div class="timer-container" style="text-align: center; padding: 20px;">
                <h2 style="font-size: 14px; color: #666;">MASHG'ULOT VAQTI</h2>
                <div id="countdown" style="font-size: 48px; font-weight: bold; font-family: monospace; color: #e74c3c;">
                    00:00:00
                </div>
                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #ccc;">
                <div class="car-info" style="font-size: 24px; font-weight: bold; background: #f1f1f1; padding: 10px; border-radius: 8px;">
                     🚗 ${instructor_car_number}
                </div>
            </div>
        `;

        // 3. Taymerni ishga tushirish
        startCountdown(lesson_minutes * 60); // minutni sekundga o'tkazamiz

        // Skanerni to'xtatish (lekin reload qilmaymiz, chunki taymerni ko'rishimiz kerak)
        if (typeof html5QrCode !== 'undefined' && html5QrCode.getState() === 2) {
            await html5QrCode.stop();
        }

    } catch (err) {
        console.error("Xato:", err);
        alert("Xatolik: " + (err.message || "Noma'lum xato"));
        startBtn.disabled = false;
    }
}

function startCountdown(duration) {
    let timer = duration, hours, minutes, seconds;
    const display = document.querySelector('#countdown');

    lessonTimer = setInterval(function () {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = hours + ":" + minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(lessonTimer);
            display.textContent = "VAQT TUGADI!";
            display.style.color = "black";
            alert("Mashg'ulot vaqti yakunlandi!");
        }
    }, 1000);
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