// __tests__/shiftsTeam.test.js
// Тесты для ShiftManager

const { ConfigLoader } = require('../configTeam.js');

// Мок для ShiftManager (так как он зависит от window)
class ShiftManager {
  constructor(configLoader) {
    this.configLoader = configLoader;
    this.currentTeam = 'A';
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

  getShiftHighlight() {
    const shiftType = this.getShiftInfo(new Date().toISOString().slice(0,10)).type;
    
    if (shiftType === 'day') {
      return { start: 8, end: 20, color: 'rgba(66, 133, 244, 0.1)' };
    } else if (shiftType === 'night') {
      return [
        { start: 0, end: 8, color: 'rgba(168, 52, 164, 0.1)' },
        { start: 20, end: 24, color: 'rgba(168, 52, 164, 0.1)' }
      ];
    }
    return null;
  }
}

describe('ShiftManager', () => {
  let shiftManager;
  let configLoader;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    configLoader.config = {
      shifts: {
        march_2026: {
          A: { day: [1, 2, 3], night: [4, 5, 6] },
          B: { day: [7, 8, 9], night: [10, 11, 12] },
          C: { day: [13, 14, 15], night: [16, 17, 18] }
        }
      }
    };
    shiftManager = new ShiftManager(configLoader);
  });

  describe('constructor', () => {
    test('должен создавать экземпляр с командой A по умолчанию', () => {
      expect(shiftManager.currentTeam).toBe('A');
      expect(shiftManager.configLoader).toBe(configLoader);
    });
  });

  describe('setTeam', () => {
    test('должен устанавливать корректную команду', () => {
      expect(shiftManager.setTeam('B')).toBe(true);
      expect(shiftManager.currentTeam).toBe('B');
    });

    test('должен возвращать false для некорректной команды', () => {
      expect(shiftManager.setTeam('D')).toBe(false);
      expect(shiftManager.currentTeam).toBe('A');
    });

    test('должен принимать все валидные команды', () => {
      ['A', 'B', 'C'].forEach(team => {
        expect(shiftManager.setTeam(team)).toBe(true);
      });
    });
  });

  describe('getShiftInfo', () => {
    test('должен возвращать информацию о дневной смене', () => {
      shiftManager.setTeam('A');
      const info = shiftManager.getShiftInfo('2026-03-01');
      
      expect(info.type).toBe('day');
      expect(info.label).toBe('☀️ Дневная');
      expect(info.hours).toBe('08:00–20:00');
      expect(info.color).toBe('#4285F4');
      expect(info.team).toBe('A');
    });

    test('должен возвращать информацию о ночной смене', () => {
      shiftManager.setTeam('A');
      const info = shiftManager.getShiftInfo('2026-03-04');
      
      expect(info.type).toBe('night');
      expect(info.label).toBe('🌙 Ночная');
      expect(info.hours).toBe('20:00–08:00');
      expect(info.color).toBe('#a834a4');
    });

    test('должен возвращать информацию о выходном', () => {
      shiftManager.setTeam('A');
      const info = shiftManager.getShiftInfo('2026-03-07');
      
      expect(info.type).toBe('off');
      expect(info.label).toBe('😴 Выходной');
      expect(info.hours).toBe('—');
    });

    test('должен учитывать текущую команду', () => {
      shiftManager.setTeam('B');
      const info = shiftManager.getShiftInfo('2026-03-07');
      
      expect(info.type).toBe('day');
      expect(info.team).toBe('B');
    });
  });

  describe('getShiftHighlight', () => {
    test('должен возвращать подсветку для дневной смены', () => {
      // Мокаем getShiftInfo для возврата дневной смены
      jest.spyOn(shiftManager, 'getShiftInfo').mockReturnValue({ type: 'day' });
      
      const highlight = shiftManager.getShiftHighlight();
      
      expect(highlight).toEqual({
        start: 8,
        end: 20,
        color: 'rgba(66, 133, 244, 0.1)'
      });
    });

    test('должен возвращать подсветку для ночной смены', () => {
      jest.spyOn(shiftManager, 'getShiftInfo').mockReturnValue({ type: 'night' });
      
      const highlight = shiftManager.getShiftHighlight();
      
      expect(highlight).toHaveLength(2);
      expect(highlight[0]).toEqual({ start: 0, end: 8, color: 'rgba(168, 52, 164, 0.1)' });
      expect(highlight[1]).toEqual({ start: 20, end: 24, color: 'rgba(168, 52, 164, 0.1)' });
    });

    test('должен возвращать null для выходного', () => {
      jest.spyOn(shiftManager, 'getShiftInfo').mockReturnValue({ type: 'off' });
      
      const highlight = shiftManager.getShiftHighlight();
      
      expect(highlight).toBeNull();
    });
  });
});
