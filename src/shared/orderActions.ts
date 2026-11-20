export type OrderCapabilities = {
  create: boolean;
  manage: boolean;
  warehouse: boolean;
  closing: boolean;
};
export const orderActionLabels: Record<string, string> = {
  submit: 'Gửi duyệt',
  approve: 'Duyệt đơn',
  reject: 'Từ chối',
  'need-info': 'Yêu cầu bổ sung',
  resubmit: 'Gửi lại',
  confirm: 'Xác nhận số lượng',
  ship: 'Xuất kho',
  dispatch: 'Bắt đầu giao',
  delivered: 'Xác nhận đã giao',
  receipt: 'Ghi nhận thực nhận',
  reconcile: 'Đối soát',
  close: 'Đóng đơn',
  cancel: 'Hủy đơn',
  reorder: 'Đặt lại',
  return: 'Tạo phiếu hoàn',
};
export function orderActions(status: string, channel: string, can: OrderCapabilities) {
  const actions: string[] = [];
  if (channel === 'sales') {
    if (can.manage) {
      if (status === 'SUBMITTED') actions.push('confirm', 'cancel');
      if (status === 'NPP_CONFIRMED') actions.push('ship', 'cancel');
      if (status === 'PICKING') actions.push('dispatch');
      if (status === 'DELIVERING') actions.push('receipt');
    }
    return actions;
  }
  if (status === 'DRAFT' && can.create) actions.push('submit');
  if (['PENDING_APPROVAL', 'ON_HOLD_CREDIT'].includes(status) && can.manage)
    actions.push('approve', 'need-info', 'reject');
  if (status === 'NEED_INFO' && can.create) actions.push('resubmit');
  if (status === 'APPROVED' && can.manage) actions.push('confirm');
  if (status === 'CONFIRMED_QTY' && can.manage) actions.push('ship');
  if (status === 'SHIPPED' && can.manage) actions.push('dispatch');
  if (status === 'IN_DELIVERY' && can.manage) actions.push('delivered');
  if (status === 'DELIVERED' && (can.create || can.warehouse || can.manage))
    actions.push('receipt');
  if (['RECEIVED', 'RECEIVED_DISCREPANCY', 'AUTO_RECEIVED'].includes(status) && can.closing)
    actions.push('reconcile');
  if (status === 'RECONCILED' && can.closing) actions.push('close');
  if (['RECEIVED', 'AUTO_RECEIVED', 'RECONCILED', 'CLOSED'].includes(status) && can.create)
    actions.push('return');
  if (can.create) actions.push('reorder');
  if (
    [
      'DRAFT',
      'PENDING_APPROVAL',
      'ON_HOLD_CREDIT',
      'NEED_INFO',
      'APPROVED',
      'CONFIRMED_QTY',
    ].includes(status) &&
    (can.create || can.manage)
  )
    actions.push('cancel');
  return actions;
}
export const primaryOrderAction = (actions: string[]) =>
  actions.find((value) => !['cancel', 'reorder', 'return'].includes(value));
export const orderCompleted = (status: string, channel: string) =>
  channel === 'sales' ? status === 'DELIVERED' : status === 'CLOSED';
