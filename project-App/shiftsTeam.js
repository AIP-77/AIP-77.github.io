// shifts.js
class ShiftManager {
  constructor(configLoader) {
    this.configLoader = configLoader;
    this.currentTeam = 'A'; // Default team view
  }

  setTeam(team) {
    if (['A', 'B', 'C'].includes(team)) {
      this.currentTeam = team;
      return true;
    }
    return false;
  }

  getShiftInfo(dateStr) {
    const shiftType = this.configLoader.getShiftForDate(dateStr, this.currentTeam);
    
    const info = {
      'day': { label: '☀️ Дневная', hours: '08:00–20:00', color: '#4285F4' },
      'night': { label: '🌙 Ночная', hours: '20:00–08:00', color: '#a834a4' },
      'off': { label: '😴 Выходной', hours: '—', color: '#9aa0a6' }
    };
    
    return { ...info[shiftType], type: shiftType, team: this.currentTeam };
  }

  updateShiftIndicator(dateStr) {
    const indicator = document.getElementById('currentShift');
    if (!indicator) return;
    
    const info = this.getShiftInfo(dateStr);
    indicator.textContent = `Смена ${this.currentTeam}: ${info.label}`;
    indicator.style.color = info.color;
    indicator.style.borderColor = info.color + '40';
  }

  // Highlight chart based on shift hours
  getShiftHighlight() {
    const shiftType = this.getShiftInfo(new Date().toISOString().slice(0,10)).type;
    
    if (shiftType === 'day') {
      // Highlight 8:00–20:00
      return { start: 8, end: 20, color: 'rgba(66, 133, 244, 0.1)' };
    } else if (shiftType === 'night') {
      // Highlight 20:00–24:00 and 0:00–8:00
      return [
        { start: 0, end: 8, color: 'rgba(168, 52, 164, 0.1)' },
        { start: 20, end: 24, color: 'rgba(168, 52, 164, 0.1)' }
      ];
    }
    return null;
  }
}

window.shiftManager = new ShiftManager(window.configLoader);
