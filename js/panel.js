// Supabase sozlamalari (O'zingiznikini qo'ying)
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const warningSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // 10 min qolganda
const endSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3');     // Tugaganda

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

// Sahifa yuklanganda davom etayotgan darsni tekshirish
async function checkCurrentLesson() {
    const currentInstId = sessionStorage.getItem('instructor_id');
    if (!currentInstId) return;

    try {
        const { data, error } = await _supabase.rpc('check_active_lesson', {
            inst_id: parseInt(currentInstId)
        });

        if (error) throw error;

        if (data && data.length > 0) {
            const lesson = data[0];

            // Agar vaqt hali tugamagan bo'lsa (yoki ozgina o'tib ketgan bo'lsa ham tugmani ko'rsatish uchun)
            if (lesson.res_remaining_seconds > -3600) { // 1 soat o'tib ketmagan bo'lsa

                // Skanerlash kartasini yashiramiz
                document.querySelector('.qr-card').style.display = 'none';
                const ticketResultDiv = document.getElementById('ticketResult');
                ticketResultDiv.style.display = 'block';

                // Taymer interfeysini chizamiz
                ticketResultDiv.innerHTML = `
                    <div class="timer-wrapper" style="background: #1a2634; color: white; padding: 30px; border-radius: 15px; text-align: center; border: 2px solid #3498db; margin-top: 10px;">
                        <p style="color: #3498db; text-transform: uppercase;">DAVOM ETAYOTGAN MASHG'ULOT</p>
                        <div id="countdown" style="font-size: 55px; font-weight: 800; font-family: monospace; margin: 15px 0;">00:00:00</div>
                        <div style="border-top: 1px solid #34495e; margin: 15px 0;"></div>
                        <div id="actionArea">
                            <div class="car-tag" style="background: #f1c40f; color: #000; padding: 8px 20px; border-radius: 50px; font-weight: bold; font-size: 20px;">🚗 ${lesson.res_car_number}</div>
                        </div>
                    </div>
                `;

                // Taymerni qolgan soniyadan boshlaymiz
                startCountdown(lesson.res_remaining_seconds, lesson.res_ticket_id);
            }
        }
    } catch (err) {
        console.error("Darsni tekshirishda xato:", err);
    }
}

// Sahifa yuklanganda ushbu tekshiruvni ham chaqiramiz
checkCurrentLesson(); // <--- SHU QATORNI QO'SHING

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

    // DIQQAT: Taymerni 'ticketResult' diviga chiqaramiz, chunki ma'lumotlar o'sha yerda
    const ticketResultDiv = document.getElementById('ticketResult');

    const currentInstId = sessionStorage.getItem('instructor_id');

    if (!currentInstId) {
        alert("Xatolik: Instruktor ID topilmadi!");
        return;
    }

    startBtn.disabled = true;
    startBtn.innerText = "Bajarilmoqda...";

    try {
        const { data, error } = await _supabase.rpc('start_lesson_complete', {
            chek_id: parseInt(ticketId),
            current_instructor_id: parseInt(currentInstId)
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("Bazada ma'lumot topilmadi!");
        }

        // SQL'dan kelgan nomlarni qabul qilamiz
        const minutes = data[0].res_minutes || data[0].lesson_minutes;
        const carNo = data[0].res_car_number || data[0].instructor_car_number;

        // UI-ni butunlay yangilaymiz (Mashg'ulot ma'lumotlari o'rniga taymer)
        ticketResultDiv.innerHTML = `
            <div class="timer-wrapper" style="
                background: #1a2634; 
                color: white; 
                padding: 30px; 
                border-radius: 15px; 
                text-align: center; 
                border: 2px solid #3498db;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                margin-top: 10px;
            ">
                <p style="margin: 0; font-size: 14px; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">
                    MASHG'ULOT KETMOQDA
                </p>
                
                <div id="countdown" style="
                    font-size: 55px; 
                    font-weight: 800; 
                    font-family: 'Courier New', monospace; 
                    color: #ffffff; 
                    margin: 15px 0;
                ">
                    00:00:00
                </div>

                <div style="border-top: 1px solid #34495e; margin: 15px 0;"></div>

                <div id="actionArea">
                    <div class="car-tag" style="
                        display: inline-block;
                        background: #f1c40f;
                        color: #000;
                        padding: 8px 20px;
                        border-radius: 50px;
                        font-weight: bold;
                        font-size: 20px;
                    ">
                        🚗 ${carNo}
                    </div>
                </div>
            </div>
        `;

        // TUZATISH: ticketId ni startCountdown funksiyasiga uzatdik
        startCountdown(minutes * 60, ticketId);

        // Skanerni to'xtatish
        if (typeof html5QrCode !== 'undefined' && html5QrCode.getState() === 2) {
            await html5QrCode.stop();
        }

    } catch (err) {
        console.error("To'liq xato:", err);
        alert("Xatolik: " + (err.message || "Tizimda chigallik yuz berdi"));
        startBtn.disabled = false;
        startBtn.innerText = "▶ Mashg'ulotni boshlash";
    }
}

// Taymerni sanash funksiyasi
function startCountdown(duration, ticketId) {
    // Sahifa yangilanganda duration manfiy bo'lishi mumkin, shuning uchun timer o'zgaruvchisini saqlaymiz
    let timer = duration, hours, minutes, seconds;

    // AGAR vaqt allaqachon tugab bo'lgan bo'lsa (sahifa yangilanganda)
    if (timer <= 0) {
        const display = document.querySelector('#countdown');
        if (display) {
            display.textContent = "VAQT TUGADI!";
            display.style.color = "#e74c3c";
        }

        const actionArea = document.getElementById('actionArea');
        if (actionArea) {
            actionArea.innerHTML = `
                <button onclick="finishLesson('${ticketId}')" style="
                    background: #27ae60; 
                    color: white; 
                    border: none; 
                    padding: 15px 30px; 
                    border-radius: 10px; 
                    font-size: 18px; 
                    font-weight: bold; 
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                    margin-top: 10px;
                    width: 100%;
                ">
                    ✅ Mashg'ulotni yakunlash
                </button>
            `;
        }
        return; // Funksiyani shu yerda to'xtatamiz, setInterval kerak emas
    }

    const interval = setInterval(async function () {
        const display = document.querySelector('#countdown');
        if (!display) { clearInterval(interval); return; }

        // 10 daqiqa qolganda ogohlantirish (600 sekund)
        if (timer === 600) {
            warningSound.play().catch(e => console.log("Audio xatosi:", e));
        }

        hours = Math.floor(timer / 3600);
        minutes = Math.floor((timer % 3600) / 60);
        seconds = Math.floor(timer % 60);

        display.textContent =
            (hours < 10 ? "0" + hours : hours) + ":" +
            (minutes < 10 ? "0" + minutes : minutes) + ":" +
            (seconds < 10 ? "0" + seconds : seconds);

        if (--timer < 0) {
            clearInterval(interval);
            endSound.play().catch(e => console.log("Audio xatosi:", e));
            display.textContent = "VAQT TUGADI!";

            // TUZATISH: actionArea orqali tugmani xavfsiz chiqaramiz
            const actionArea = document.getElementById('actionArea');
            if (actionArea) {
                actionArea.innerHTML = `
                    <button onclick="finishLesson('${ticketId}')" style="
                        background: #27ae60; 
                        color: white; 
                        border: none; 
                        padding: 15px 30px; 
                        border-radius: 10px; 
                        font-size: 18px; 
                        font-weight: bold; 
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                        margin-top: 10px;
                        width: 100%;
                    ">
                        ✅ Mashg'ulotni yakunlash
                    </button>
                `;
            }
        }
    }, 1000);
}

// 4. Darsni tugatish funksiyasi
async function finishLesson(ticketId) {
    // Agar ticketId string bo'lsa, son qilib olamiz
    const cleanId = parseInt(ticketId);

    const finishBtn = event.target;
    finishBtn.disabled = true;
    finishBtn.innerText = "Bazaga yozilmoqda...";

    try {
        const { error } = await _supabase.rpc('end_lesson_complete', {
            chek_id: cleanId
        });

        if (error) throw error;

        alert("Mashg'ulot muvaffaqiyatli yakunlandi!");
        window.location.reload();

    } catch (err) {
        console.error("Finish Error:", err);
        alert("Xatolik: " + err.message);
        finishBtn.disabled = false;
        finishBtn.innerText = "✅ Mashg'ulotni yakunlash";
    }
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