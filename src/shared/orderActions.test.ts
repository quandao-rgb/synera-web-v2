import { describe, it, expect } from 'vitest';
import { orderActions, primaryOrderAction, orderCompleted } from './orderActions';
const all = { create: true, manage: true, warehouse: true, closing: true };
describe('order action belongs to its current status and role', () => {
  it('closed/cancelled orders have no processing action, while active orders expose the next step', () => {
    expect(primaryOrderAction(orderActions('CLOSED', 'sellin', all))).toBeUndefined();
    expect(primaryOrderAction(orderActions('CANCELLED', 'sellin', all))).toBeUndefined();
    expect(primaryOrderAction(orderActions('PENDING_APPROVAL', 'sellin', all))).toBe('approve');
    expect(primaryOrderAction(orderActions('RECONCILED', 'sellin', all))).toBe('close');
    expect(primaryOrderAction(orderActions('DELIVERED', 'sales', all))).toBeUndefined();
    expect(orderCompleted('DELIVERED', 'sales')).toBe(true);
    expect(orderCompleted('RECEIVED', 'sellin')).toBe(false);
  });
  it('does not offer a manufacturer approval to a distributor or an action to a read-only actor', () => {
    expect(
      primaryOrderAction(orderActions('PENDING_APPROVAL', 'sellin', { ...all, manage: false })),
    ).toBeUndefined();
    expect(
      orderActions('SUBMITTED', 'sales', {
        create: false,
        manage: false,
        closing: false,
        warehouse: false,
      }),
    ).toEqual([]);
  });
});
