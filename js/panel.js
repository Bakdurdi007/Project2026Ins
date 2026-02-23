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

    const { data, error } = await _supabase
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
    qrbox: { width: 200, height: 200 },
    aspectRatio: 1.0
};

// Kamerani ishga tushirish (orqa kamera - environment)
html5QrCode.start(
    { facingMode: "environment" },
    qrConfig,
    (decodedText) => {
        // Muvaffaqiyatli skanerlanganda
        document.getElementById('result').innerText = "QR o'qildi: " + decodedText;
        document.getElementById('result').style.color = "#2ecc71";

        // Bu yerda decodedText orqali Supabase'dan qidiruv qilasiz
        console.log("Ma'lumot:", decodedText);
    },
    (errorMessage) => {
        // Skanerlash davom etmoqda...
    }
).catch((err) => {
    document.getElementById('result').innerText = "Kameraga ruxsat berilmadi!";
});






//0. Chiqish funksiyasi
logoutBtn.addEventListener('click', () => {
    if(confirm("Tizimdan chiqmoqchimisiz?")) {
        sessionStorage.clear();
        window.location.replace('index.html');
    }
});

// Sahifa yuklanganda ishga tushadi
loadInstructorData();