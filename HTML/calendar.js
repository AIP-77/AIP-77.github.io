
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  calendarTitle.textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay();
  
  calendarDaysContainer.innerHTML = '';
  
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  dayNames.forEach(name => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = name;
    calendarDaysContainer.appendChild(header);
  });
  
  for (let i = 0; i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day disabled';
    calendarDaysContainer.appendChild(empty);
  }
  
  const availableDates = new Set(records.map(r => r['Рабочий день']));
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
    const hasData = availableDates.has(dateStr);
    
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${hasData ? ' has-data' : ''}${dateStr === selectedDate ? ' selected' : ''}`;
    dayEl.textContent = day;
    
    if (hasData) {
      dayEl.addEventListener('click', () => {
        selectedDate = dateStr;
        renderReport();
      });
    } else {
      dayEl.classList.add('disabled');
    }
    
    calendarDaysContainer.appendChild(dayEl);
  }
  
  const lastDayOfWeek = lastDay.getDay();
  const remaining = 6 - (lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1);
  for (let i = 0; i < remaining; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day disabled';
    calendarDaysContainer.appendChild(empty);
  }
}

function setupCalendarListeners() {
  prevMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    const targetArchive = getArchiveNameForDate(currentMonth);
    if (currentArchive !== targetArchive) {
      currentArchive = targetArchive;
      selectedDate = '';
      loadData();
    } else {
      renderCalendar();
    }
  });
  
  nextMonthBtn.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    const targetArchive = getArchiveNameForDate(currentMonth);
    if (currentArchive !== targetArchive) {
      currentArchive = targetArchive;
      selectedDate = '';
      loadData();
    } else {
      renderCalendar();
    }
  });
}
