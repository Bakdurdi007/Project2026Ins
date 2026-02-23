// 1. Supabase sozlamalari
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tymXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const warningSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const endSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3');

const instructorNameElem = document.getElementById('instructorName');
const logoutBtn = document.getElementById('logoutBtn');
const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 10, qrbox: {width: 220, height: 220}, aspectRatio: 1.0 };

// 2. MUHIM: Skaner holati uchun qulf
let scannerInitialized = false;

// 3. Instruktor ma'lumotlarini yuklash
async function loadInstructorData() {
    const userLogin = sessionStorage.getItem('userName');
    if (!userLogin) return;
    const {data, error} = await _supabase.from('instructors').select('full_name').eq('login', userLogin).single();
    if (data && !error) instructorNameElem.innerText = data.full_name;
}

// 4. Skanerni yoqish (Faqat dars yo'qligi aniq bo'lsa chaqiriladi)
function startScannerNow() {
    if (scannerInitialized) return; // Agar yoqilgan bo'lsa qaytib yoqma

    html5QrCode.start({facingMode: "environment"}, qrConfig, (decodedText) => {
        handleTicket(decodedText);
    }, (errorMessage) => {}).then(() => {
        scannerInitialized = true;
    }).catch((err) => {
        document.getElementById('result').innerText = "Kameraga ruxsat berilmadi!";
    });
}

// 5. QR Skanerlanganda chiptani tekshirish
async function handleTicket(ticketId) {
    const {data, error} = await _supabase.from('tickets').select(`*, centers:center_name ( name ), admins:admin_id ( admin_fullname )`).eq('id', ticketId).single();
    if (error || !data) {
        alert("Chipta topilmadi!");
        return;
    }
    try { await html5QrCode.stop(); scannerInitialized = false; } catch (err) {}

    document.querySelector('.qr-card').style.display = 'none';
    const resultDiv = document.getElementById('ticketResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="ticket-header">Chipta: ${data.id}</div>
        <div class="ticket-info-row"><span>👤</span> <span>${data.full_name}</span></div>
        <div class="ticket-info-row"><span>⌛</span> <span>${data.minute} minut</span></div>
        <button class="start-btn" onclick="startLesson('${data.id}')">▶ Mashg'ulotni boshlash</button>
    `;
}

// 6. Mashg'ulotni boshlash
async function startLesson(ticketId) {
    const currentInstId = sessionStorage.getItem('instructor_id');
    try {
        const { data, error } = await _supabase.rpc('start_lesson_complete', {
            chek_id: parseInt(ticketId),
            current_instructor_id: parseInt(currentInstId)
        });
        if (error) throw error;
        // Dars boshlangach sahifani yangilaymiz, shunda main() o'zi taymerni tiklaydi
        window.location.reload();
    } catch (err) {
        alert("Xatolik: " + err.message);
    }
}

// 7. Taymerni sanash
function runCountdown(seconds, ticketId) {
    let timer = seconds;
    const interval = setInterval(() => {
        const display = document.querySelector('#countdown');
        if (!display) { clearInterval(interval); return; }

        let h = Math.floor(timer / 3600);
        let m = Math.floor((timer % 3600) / 60);
        let s = Math.floor(timer % 60);
        display.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

        if (--timer < 0) {
            clearInterval(interval);
            display.textContent = "VAQT TUGADI!";
            document.getElementById('actionArea').innerHTML = `<button onclick="finishLesson('${ticketId}')" style="background:#27ae60; color:white; padding:15px; width:100%; border:none; border-radius:10px; font-weight:bold;">✅ YAKUNLASH</button>`;
        }
    }, 1000);
}

// 8. Darsni yakunlash
async function finishLesson(ticketId) {
    try {
        await _supabase.rpc('end_lesson_complete', { chek_id: parseInt(ticketId) });
        window.location.reload();
    } catch (err) { alert(err.message); }
}

// 9. !!! ASOSIY QISM: QAYSI OYNANI KO'RSATISHNI HAL QILISH !!!
async function initApp() {
    await loadInstructorData();
    const instId = sessionStorage.getItem('instructor_id');

    if (!instId) {
        startScannerNow();
        return;
    }

    // Bazani tekshiramiz
    const { data, error } = await _supabase.rpc('check_active_lesson', { inst_id: parseInt(instId) });

    if (!error && data && data.length > 0) {
        // DARS BOR: Skaner oynasini yashirib, Taymerni chiqaramiz
        document.querySelector('.qr-card').style.display = 'none';
        const ticketResultDiv = document.getElementById('ticketResult');
        ticketResultDiv.style.display = 'block';
        ticketResultDiv.innerHTML = `
            <div class="timer-wrapper" style="background:#1a2634; color:white; padding:30px; border-radius:15px; text-align:center; border:2px solid #3498db;">
                <p>MASHG'ULOT KETMOQDA</p>
                <div id="countdown" style="font-size:50px; font-weight:bold; margin:20px 0;">00:00:00</div>
                <div id="actionArea">
                    <div style="background:#f1c40f; color:black; padding:10px; border-radius:50px; font-weight:bold;">🚗 ${data[0].res_car_number}</div>
                </div>
            </div>
        `;
        runCountdown(data[0].res_remaining_seconds, data[0].res_ticket_id);
    } else {
        // DARS YO'Q: Skanerni yoqamiz
        startScannerNow();
    }
}

// Logout
logoutBtn.addEventListener('click', () => { if(confirm("Chiqasizmi?")){ sessionStorage.clear(); window.location.replace('index.html'); }});

// ILOVANI ISHGA TUSHIRISH
initApp();