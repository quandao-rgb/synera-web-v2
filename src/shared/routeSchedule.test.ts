import { describe, expect, it } from 'vitest';
import { mondayOf, shiftDay, weekDays } from './routeSchedule';
describe('weekly route planning dates', () => {
  it('keeps Sunday in the preceding Monday week and crosses month/year correctly', () => {
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
    expect(weekDays('2026-12-28')[6]).toBe('2027-01-03');
    expect(shiftDay('2026-11-09', -7)).toBe('2026-11-02');
  });
});
