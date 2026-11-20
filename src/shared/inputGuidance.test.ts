import { it, expect } from 'vitest';
import { inputExample } from './inputGuidance';
it('shows meaningful examples without suggesting invalid quantities or injecting real values', () => {
  expect(inputExample({ key: 'amount', label: 'Số tiền', type: 'number' })).toBe('VD: 1500000');
  expect(inputExample({ key: 'qty_1', label: 'Số nhận', type: 'number', min: 0, max: 2 })).toBe(
    'VD: 2',
  );
  expect(inputExample({ key: 'name', label: 'Tên sản phẩm' })).toContain('Nước khoáng');
  expect(inputExample({ key: 'reference', label: 'Mã tham chiếu' })).toContain('CK-');
  expect(inputExample({ key: 'day', label: 'Ngày', type: 'date' })).toContain('ngày/tháng/năm');
});
