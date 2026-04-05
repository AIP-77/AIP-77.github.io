// ============================================
// 8. ИНИЦИАЛИЗАЦИЯ
// ============================================
async function init() {
    try {
        if(authInput) authInput.value = '';

        if (window.Telegram?.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            applyTelegramTheme();
            const user = Telegram.WebApp.initDataUnsafe.user;
            if (user?.id) {
                chatId = String(user.id);
                localStorage.setItem('userAuthId', chatId);
                if(authForm) authForm.style.display = 'none';
                await loadUserData();
                return;
            }
        }

        const savedId = localStorage.getItem('userAuthId');
        if (savedId) {
            chatId = savedId;
            if(authForm) authForm.style.display = 'none';
            await loadUserData();
        } else {
            if(authForm) authForm.style.display = 'flex';
            if(authInput) authInput.focus();
        }
    } catch (err) {
        loading.classList.add('hidden');
        showError('Ошибка: ' + err.message);
    }
}

// ============================================
// 9. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================
prevMonthBtn.addEventListener('click', async () => {
    if (currentMonthIndex > 0) {
        currentMonthIndex--;
        await renderCalendarForMonth(availableMonths[currentMonthIndex]);
    }
});

nextMonthBtn.addEventListener('click', async () => {
    if (currentMonthIndex < availableMonths.length - 1) {
        currentMonthIndex++;
        await renderCalendarForMonth(availableMonths[currentMonthIndex]);
    }
});

refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Обновление...';
    try {
        await loadUserData();
        showBanner('Данные обновлены', 'success', 3000);
    } catch (err) {
        showBanner('Ошибка: ' + err.message, 'error', 5000);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Обновить данные';
    }
});

clearCacheBtn.addEventListener('click', () => {
    if (confirm('Очистить кэш?')) {
        localStorage.removeItem('userAuthId');
        location.reload();
    }
});

tabEmployee.addEventListener('click', () => switchTab('employee'));
tabManager.addEventListener('click', () => switchTab('manager'));
tabAdmin.addEventListener('click', () => {
    if (isAdmin) window.location.href = 'HTML/admin.html';
});
tabStatistics.addEventListener('click', () => {
    if (isManager || isAdmin) window.location.href = 'HTML/statistics.html';
});

function switchTab(tabName) {
    employeeView.classList.add('hidden');
    managerView.classList.add('hidden');
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    if (tabName === 'employee') {
        employeeView.classList.remove('hidden');
        tabEmployee.classList.add('active');
    } else if (tabName === 'manager' && isManager) {
        window.location.href = 'manager.html';
    }
}

authSubmit.addEventListener('click', async () => {
    const val = authInput.value.trim();
    if (!val) {
        showBanner('Введите ID!', 'error', 3000);
        return;
    }
    chatId = val;
    localStorage.setItem('userAuthId', chatId);
    authForm.style.display = 'none';
    await loadUserData();
});

changeDepartmentBtn.addEventListener('click', () => {
    departmentReport.classList.add('hidden');
    departmentSelector.classList.remove('hidden');
    departmentSelect.value = '';
});

departmentSelect.addEventListener('change', async () => {
    if (!departmentSelect.value) return;
    departmentSelector.classList.add('hidden');
    departmentReport.classList.remove('hidden');
    document.getElementById('dept-name').textContent = departmentSelect.value;
    await loadDepartmentData(departmentSelect.value);
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('Ошибка: ' + event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('Ошибка: ' + event.reason);
});

window.onload = init;
