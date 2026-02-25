// 1. Supabase sozlamalari - LOCK xatosini oldini olish uchun "localStorage" ga o'tkazildi
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';

const _supabase = supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: false,
        storage: window.localStorage, // MUHIM: Xatolikni shu qator tuzatadi!
        flowType: 'implicit'
    }
});

const warningSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const endSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3');

const instructorNameElem = document.getElementById('instructorName');
const logoutBtn = document.getElementById('logoutBtn');

// Skaner obyekti
const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 10, qrbox: {width: 220, height: 220}, aspectRatio: 1.0 };
let activeCountdownInterval = null; // Taymer ustma-ust tushmasligi uchun

async function loadInstructorData() {
    const userLogin = sessionStorage.getItem('userName');
    if (!userLogin) return;

    const {data, error} = await _supabase.from('instructors').select('full_name').eq('login', userLogin).single();
    instructorNameElem.innerText = (data && !error) ? data.full_name : "Instructor";
}

function initScanner() {
    document.querySelector('.qr-card').style.display = 'block';
    html5QrCode.start({facingMode: "environment"}, qrConfig, (decodedText) => {
        handleTicket(decodedText);
    }).catch(err => console.error("Kamera xatosi:", err));
}

async function handleTicket(ticketId) {
    const {data, error} = await _supabase
        .from('tickets')
        .select(`*, centers:center_name ( name ), admins:admin_id ( admin_fullname )`)
        .eq('id', ticketId)
        .single();

    if (error || !data) {
        showModal("Xato: Ticket topilmadi!");
        return;
    }

    try { await html5QrCode.stop(); } catch (err) {}

    document.querySelector('.qr-card').style.display = 'none';
    const resultDiv = document.getElementById('ticketResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="ticket-header">Mashg'ulot ma'lumotlari:</div>       
        <div class="ticket-info-row"><span>🔑</span> <span class="info-label">Navbat:</span> <span class="token-value">${data.id || '---'}</span></div>       
        <div class="ticket-info-row"><span>👤</span> <span class="info-label">Ism:</span> <span class="info-value">${data.full_name || 'Noma`lum'}</span></div>
        <div class="ticket-info-row"><span>🏢</span> <span class="info-label">Markaz:</span> <span class="info-value">${data.centers ? data.centers.name : 'Topilmadi'}</span></div>
        <div class="ticket-info-row"><span>👥</span> <span class="info-label">Guruh:</span> <span class="info-value">${data.group || '---'}</span></div>
        <div class="ticket-info-row"><span>📚</span> <span class="info-label">Kurs:</span> <span class="info-value">${data.direction_category || '---'}</span></div>
        <div class="ticket-info-row"><span>💰</span> <span class="info-label">Summa:</span> <span class="info-value">${data.payment_amount || '---'} so'm</span></div>
        <div class="ticket-info-row"><span>⌛</span> <span class="info-label">Vaqt:</span> <span class="info-value">${data.minute || '---'} min</span></div>
        <div class="ticket-info-row"><span>📅</span> <span class="info-label">Sana:</span> <span class="info-value">${formatMyDate(data.created_at) || '---'}</span></div>
        <div class="ticket-info-row"><span>👨‍💻</span> <span class="info-label">Admin:</span> <span class="info-value">${data.admin_id || '---'}</span></div>
        <button class="start-btn" onclick="startLesson('${data.id}')">▶ Mashg'ulotni boshlash</button>
    `;
}

function formatMyDate(dateString) {
    const date = new Date(dateString);

    // Har bir qismni alohida olamiz va 0 bilan to'ldiramiz (masalan: 2 -> 02)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Oylar 0 dan boshlanadi
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Darsni boshlash tugmasi bosilganda
async function startLesson(ticketId) {
    const startBtn = document.querySelector('.start-btn');
    const currentInstId = sessionStorage.getItem('instructor_id');
    if (!currentInstId) return;

    startBtn.disabled = true;
    startBtn.innerText = "Bajarilmoqda...";

    try {
        // SQL-dagi to'g'irlangan funksiyani chaqiramiz
        const { data, error } = await _supabase.rpc('start_lesson_complete', {
            chek_id: parseInt(ticketId),
            current_instructor_id: parseInt(currentInstId)
        });

        if (error) throw error;

        if (data && data.length > 0) {
            showTimerUI(data[0]); // Taymerni bitta joydan chizamiz
        }
    } catch (err) {
        showModal("Xatolik: ");
        startBtn.disabled = false;
        startBtn.innerText = "▶ Mashg'ulotni boshlash";
    }
}

// Asosiy mantiq (Sahifa yuklanganda)
async function main() {
    try {
        await loadInstructorData();
        const currentInstId = sessionStorage.getItem('instructor_id');

        if (!currentInstId) {
            initScanner();
            return;
        }

        const { data, error } = await _supabase.rpc('check_active_lesson', { inst_id: parseInt(currentInstId) });

        if (!error && data && data.length > 0) {
            showTimerUI(data[0]);
        } else {
            initScanner();
        }
    } catch (err) {
        console.error(err);
        initScanner();
    }
}

// Barcha joyda ishlatiladigan taymer dizayni (Kodingizda bu yetishmayotgan edi)
function showTimerUI(lesson) {
    document.querySelector('.qr-card').style.display = 'none';
    const resultDiv = document.getElementById('ticketResult');
    resultDiv.style.display = 'block';

    resultDiv.innerHTML = `
        <div class="timer-wrapper" style="background: #1a2634; color: white; padding: 30px; border-radius: 15px; text-align: center; border: 2px solid #3498db; margin-top: 10px;">
            <p style="margin: 0; font-size: 14px; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">MASHG'ULOT KETMOQDA</p>              
            <h2 style="margin: 10px 0; color: #ffffff; font-size: 20px;">👤 ${lesson.res_full_name}</h2>
            <div id="countdown" style="font-size: 55px; font-weight: 800; font-family: 'Courier New', monospace; color: #ffffff; margin: 15px 0;">00:00:00</div>
            <div style="border-top: 1px solid #34495e; margin: 15px 0;"></div>
            <div id="actionArea">
                <div class="car-tag" style="display: inline-block; background: #f1c40f; color: #000; padding: 8px 20px; border-radius: 50px; font-weight: bold; font-size: 20px;">🚗 ${lesson.res_car_number}</div>
            </div>
        </div>
    `;
    startCountdown(lesson.res_remaining_seconds, lesson.res_ticket_id);
}

function startCountdown(duration, ticketId) {
    let timer = duration;
    if (activeCountdownInterval) clearInterval(activeCountdownInterval);

    const showFinishButton = () => {
        const actionArea = document.getElementById('actionArea');
        if (actionArea) actionArea.innerHTML = `<button onclick="finishLesson('${ticketId}')" style="background: #27ae60; color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; width: 100%;">✅ Mashg'ulotni yakunlash</button>`;
    };

    if (timer <= 0) {
        document.querySelector('#countdown').textContent = "VAQT TUGADI!";
        showFinishButton();
        return;
    }

    activeCountdownInterval = setInterval(() => {
        const display = document.querySelector('#countdown');
        if (!display) { clearInterval(activeCountdownInterval); return; }

        if (timer === 600) warningSound.play().catch(()=>{});

        let h = Math.floor(timer / 3600);
        let m = Math.floor((timer % 3600) / 60);
        let s = Math.floor(timer % 60);
        display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        if (--timer < 0) {
            clearInterval(activeCountdownInterval);
            endSound.play().catch(()=>{});
            display.textContent = "VAQT TUGADI!";
            showFinishButton();
        }
    }, 1000);
}

// 6. Mashg'ulotni yakunlash
async function finishLesson() {
    // Agar event topilmasa, xato bermasligi uchun tekshiruv
    const finishBtn = window.event ? window.event.target : document.querySelector('#actionArea button');
    if (finishBtn) {
        finishBtn.disabled = true;
        finishBtn.innerText = "Yakunlanmoqda...";
    }

    const currentInstId = sessionStorage.getItem('instructor_id');
    if (!currentInstId) {
        showModal("Xatolik: Instruktor tizimga kirmagan!");
        return;
    }

    try {
        // Parametr nomi SQL dagi nom bilan bir xil bo'lishi SHART: current_inst_id
        const { error } = await _supabase.rpc('end_lesson_complete', {
            current_inst_id: parseInt(currentInstId)
        });

        if (error) throw error;

        showModal("Mashg'ulot muvaffaqiyatli yakunlandi!");
        window.location.reload();
    } catch (err) {
        showModal("Yakunlashda xatolik: ");
        if (finishBtn) {
            finishBtn.disabled = false;
            finishBtn.innerText = "✅ Mashg'ulotni yakunlash";
        }
    }
}

logoutBtn.addEventListener('click', () => {
    if (confirm("Chiqmoqchimisiz?")) {
        sessionStorage.clear();
        window.location.replace('index.html');
    }
});

main();