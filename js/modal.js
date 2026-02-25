// Universal Modal funksiyasi
function showModal({ title, message, type = 'info', onConfirm = null }) {
    const modal = document.getElementById('universalModal');
    const titleElem = document.getElementById('modalTitle');
    const msgElem = document.getElementById('modalMessage');
    const actionsElem = document.getElementById('modalActions');
    const iconElem = document.getElementById('modalIcon');

    titleElem.innerText = title;
    msgElem.innerText = message;
    actionsElem.innerHTML = ''; // Tugmalarni tozalash

    // Ikonka va ranglarni belgilash
    if (type === 'confirm') {
        iconElem.innerHTML = '❓';
        iconElem.style.color = '#f1c40f';
    } else if (type === 'error') {
        iconElem.innerHTML = '❌';
        iconElem.style.color = '#e74c3c';
    } else {
        iconElem.innerHTML = '✅';
        iconElem.style.color = '#2ecc71';
    }

    // Tugmalarni yaratish
    if (onConfirm) {
        // Tasdiqlash rejimi (Ha / Yo'q)
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn btn-secondary';
        cancelBtn.innerText = 'Bekor qilish';
        cancelBtn.onclick = () => modal.style.display = 'none';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = `modal-btn ${type === 'confirm' ? 'btn-primary' : 'btn-danger'}`;
        confirmBtn.innerText = 'Tasdiqlash';
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            onConfirm();
        };

        actionsElem.appendChild(cancelBtn);
        actionsElem.appendChild(confirmBtn);
    } else {
        // Ogohlantirish rejimi (Faqat OK)
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-primary';
        okBtn.innerText = 'Tushunarli';
        okBtn.onclick = () => modal.style.display = 'none';
        actionsElem.appendChild(okBtn);
    }

    modal.style.display = 'flex';
}

// ENDI ESKI KODLARNI SHUNDAY O'ZGARTIRING:

// 1. Logout uchun:
logoutBtn.addEventListener('click', () => {
    showModal({
        title: 'Chiqish',
        message: 'Tizimdan chiqmoqchimisiz?',
        type: 'confirm',
        onConfirm: () => {
            sessionStorage.clear();
            window.location.replace('index.html');
        }
    });
});