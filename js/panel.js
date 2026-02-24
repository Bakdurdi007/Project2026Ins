// Supabase sozlamalari - Lock timeout muammosini hal qilish bilan
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';

const _supabase = supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: false,
        storage: window.sessionStorage, // LocalStorage o'rniga SessionStorage ishlatish xavfsizroq
        flowType: 'implicit'
    }
});

const warningSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const endSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3');

const instructorNameElem = document.getElementById('instructorName');
const logoutBtn = document.getElementById('logoutBtn');

// 1. Instructor ma'lumotlarini yuklash
async function loadInstructorData() {
    const userLogin = sessionStorage.getItem('userName');
    if (!userLogin) return;

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

// 2. Skaner obyekti va sozlamalari (Lekin u hali ishga tushmaydi)
const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 10, qrbox: {width: 220, height: 220}, aspectRatio: 1.0 };

// Skanerni yoqish funksiyasi
function initScanner() {
    html5QrCode.start({facingMode: "environment"}, qrConfig, (decodedText) => {
        handleTicket(decodedText);
    }, (errorMessage) => {
        // Skanerlash davom etmoqda...
    }).catch((err) => {
        document.getElementById('result').innerText = "Kameraga ruxsat berilmadi!";
        console.error(err);
    });
}

// 3. QR kod o'qilganda chipta ma'lumotlarini chiqarish
async function handleTicket(ticketId) {
    const {data, error} = await _supabase
        .from('tickets')
        .select(`*, centers:center_name ( name ), admins:admin_id ( admin_fullname )`)
        .eq('id', ticketId)
        .single();

    if (error || !data) {
        document.getElementById('result').innerText = "Xato: Ticket topilmadi!";
        document.getElementById('result').style.color = "#e74c3c";
        return;
    }

    try { await html5QrCode.stop(); } catch (err) { console.warn(err); }

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
        <div class="ticket-info-row"><span>💰</span> <span class="info-label">Summa:</span> <span class="info-value">${data.payment_amount || '0'} so'm</span></div>
        <div class="ticket-info-row"><span>⌛</span> <span class="info-label">Vaqt:</span> <span class="info-value">${data.minute || '---'} min</span></div>
        <div class="ticket-info-row"><span>📅</span> <span class="info-label">Sana:</span> <span class="info-value">${new Date(data.created_at).toLocaleString('uz-UZ')}</span></div>    
        <div class="ticket-info-row"><span>👨‍💻</span> <span class="info-label">Admin:</span> <span class="info-value">${data.admins ? data.admins.admin_fullname : 'Noma\'lum'}</span></div>
        <button class="start-btn" onclick="startLesson('${data.id}')">▶ Mashg'ulotni boshlash</button>
    `;
}

// 4. Mashg'ulotni boshlash (RPC chaqiruvi)
async function startLesson(ticketId) {
    const startBtn = document.querySelector('.start-btn');
    const ticketResultDiv = document.getElementById('ticketResult');
    const currentInstId = sessionStorage.getItem('instructor_id');

    if (!currentInstId) { alert("Xatolik: Instruktor ID topilmadi!"); return; }

    startBtn.disabled = true;
    startBtn.innerText = "Bajarilmoqda...";

    try {
        const { data, error } = await _supabase.rpc('start_lesson_complete', {
            chek_id: parseInt(ticketId),
            current_instructor_id: parseInt(currentInstId)
        });
        if (error) throw error;

        const minutes = data[0].res_minutes || data[0].lesson_minutes;
        const carNo = data[0].res_car_number || data[0].instructor_car_number;

        // Taymer interfeysi
        ticketResultDiv.innerHTML = `
            <div class="timer-wrapper" style="background: #1a2634; color: white; padding: 30px; border-radius: 15px; text-align: center; border: 2px solid #3498db; margin-top: 10px;">
                <p style="margin: 0; font-size: 14px; color: #3498db; text-transform: uppercase; letter-spacing: 2px;">MASHG'ULOT KETMOQDA</p>              
                <div id="countdown" style="font-size: 55px; font-weight: 800; font-family: 'Courier New', monospace; color: #ffffff; margin: 15px 0;">00:00:00</div>
                <div style="border-top: 1px solid #34495e; margin: 15px 0;"></div>
                <div id="actionArea">
                    <div class="car-tag" style="display: inline-block; background: #f1c40f; color: #000; padding: 8px 20px; border-radius: 50px; font-weight: bold; font-size: 20px;">🚗 ${carNo}</div>
                </div>
            </div>
        `;
        startCountdown(minutes * 60, ticketId);
    } catch (err) {
        alert("Xatolik: " + err.message);
        startBtn.disabled = false;
        startBtn.innerText = "▶ Mashg'ulotni boshlash";
    }
}

// 5. Taymer hisoblagichi
function startCountdown(duration, ticketId) {
    let timer = duration, hours, minutes, seconds;

    // Tugatish funksiyasi (HTML ga chiqarish uchun)
    const showFinishButton = () => {
        const actionArea = document.getElementById('actionArea');
        if (actionArea) {
            actionArea.innerHTML = `<button onclick="finishLesson('${ticketId}')" style="background: #27ae60; color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; width: 100%;">✅ Mashg'ulotni yakunlash</button>`;
        }
    };

    if (timer <= 0) {
        const display = document.querySelector('#countdown');
        if (display) {
            display.textContent = "VAQT TUGADI!";
            display.style.color = "#e74c3c";
        }
        showFinishButton();
        return;
    }

    const interval = setInterval(function () {
        const display = document.querySelector('#countdown');
        if (!display) { clearInterval(interval); return; }

        if (timer === 600) warningSound.play().catch(e => {});

        hours = Math.floor(timer / 3600);
        minutes = Math.floor((timer % 3600) / 60);
        seconds = Math.floor(timer % 60);

        display.textContent = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

        if (--timer < 0) {
            clearInterval(interval);
            endSound.play().catch(e => {});
            display.textContent = "VAQT TUGADI!";
            showFinishButton();
        }
    }, 1000);
}

// 6. Mashg'ulotni yakunlash
async function finishLesson(ticketId) {
    const finishBtn = event.target;
    finishBtn.disabled = true;
    finishBtn.innerText = "Yozilmoqda...";
    try {
        const { error } = await _supabase.rpc('end_lesson_complete', { chek_id: parseInt(ticketId) });
        if (error) throw error;
        alert("Mashg'ulot muvaffaqiyatli yakunlandi!");
        window.location.reload();
    } catch (err) {
        alert("Xatolik: " + err.message);
        finishBtn.disabled = false;
        finishBtn.innerText = "✅ Mashg'ulotni yakunlash";
    }
}

// 7. Logout
logoutBtn.addEventListener('click', () => {
    if (confirm("Tizimdan chiqmoqchimisiz?")) {
        sessionStorage.clear();
        window.location.replace('index.html');
    }
});

async function main() {
    try {
        await loadInstructorData();
        const currentInstId = sessionStorage.getItem('instructor_id');
        if (!currentInstId) {
            document.querySelector('.qr-card').style.display = 'block';
            initScanner();
            return;
        }

        // Bazani tekshirish - 5 soniya kutamiz, javob bo'lmasa skanerni yoqamiz
        const { data, error } = await Promise.race([
            _supabase.rpc('check_active_lesson', { inst_id: parseInt(currentInstId) }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (error || !data || data.length === 0) {
            // Dars yo'q yoki baza xato berdi - Skanerni yoqamiz
            document.querySelector('.qr-card').style.display = 'block';
            initScanner();
        } else {
            // Dars bor - Taymerni tiklaymiz
            const lesson = data[0];
            document.querySelector('.qr-card').style.display = 'none';
            const ticketResultDiv = document.getElementById('ticketResult');
            ticketResultDiv.style.display = 'block';
            ticketResultDiv.innerHTML = `
                <div class="timer-wrapper" style="background: #1a2634; color: white; padding: 30px; border-radius: 15px; text-align: center; border: 2px solid #3498db; margin-top: 10px;">
                    <p style="color: #3498db; text-transform: uppercase;">MASHG'ULOT DAVOM ETMOQDA</p>
                    <div id="countdown" style="font-size: 55px; font-weight: 800; font-family: monospace; margin: 15px 0;">00:00:00</div>
                    <div style="border-top: 1px solid #34495e; margin: 15px 0;"></div>
                    <div id="actionArea">
                        <div class="car-tag" style="background: #f1c40f; color: #000; padding: 8px 20px; border-radius: 50px; font-weight: bold; font-size: 20px;">🚗 ${lesson.res_car_number}</div>
                    </div>
                </div>
            `;
            startCountdown(lesson.res_remaining_seconds, lesson.res_ticket_id);
        }

    } catch (err) {
        console.error("Xatolik bo'ldi, lekin skaner yoqiladi:", err);
        document.querySelector('.qr-card').style.display = 'block';
        initScanner();
    }
}
main();