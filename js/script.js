// Supabase sozlamalari (O'zingiznikini qo'ying)
const supabaseUrl = 'https://wczijkqackrmzssfgdqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjemlqa3FhY2tybXpzc2ZnZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTk4MzksImV4cCI6MjA4NzE3NTgzOX0.ooRafiR7nR08d1f0_XEyX19AXPHRaOzjurNYw7SvZwI';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    // Instructors jadvalidan tekshirish
    const { data, error } = await _supabase
        .from('instructors')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();

    if (error || !data) {
        message.innerText = "Login yoki parol xato!";
    } else {
        // MUHIM: session对外 xotiraga yozamiz.
        // sessionStorage brauzer yopilishi bilan o'chib ketadi.
        sessionStorage.setItem('userAuthenticated', 'true');
        sessionStorage.setItem('userName', data.login);

        window.location.replace('panel.html'); // 'replace' orqaga qaytishni bloklaydi
    }
});