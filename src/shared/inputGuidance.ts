type InputField = {
  key: string;
  label: string;
  type?: string;
  min?: number | string;
  max?: number | string;
};
const examples: Record<string, string> = {
  username: 'VD: minh.anh@synera.vn',
  email: 'VD: minh.anh@synera.vn',
  phone: 'VD: 0901234567',
  address: 'VD: 42 Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh',
  owner: 'VD: Nguyễn Thanh Hương',
  code: 'VD: KV-PN-01',
  reference: 'VD: CK-20261115-001',
  reason: 'VD: Điều chỉnh theo xác nhận của khách hàng',
  note: 'VD: Khách muốn nhận hàng vào buổi sáng',
  title: 'VD: Lịch trao đổi nhu cầu nhập hàng',
  url: 'VD: https://synera.vn/tai-lieu',
  description: 'VD: Áp dụng cho đơn nhập trong thời gian chương trình',
  content: 'VD: Giao hàng trước 10 giờ, liên hệ chủ cửa hàng khi tới',
  latitude: 'VD: 10.8000',
  longitude: 'VD: 106.6800',
  batchCode: 'VD: LO-202611-01',
  lotCode: 'VD: LO-202611-01',
  lotNo: 'VD: LO-202611-01',
  category: 'VD: Đồ uống',
  baseUnit: 'VD: CHAI (đơn vị cơ sở)',
  factors: 'VD: {"CHAI":1,"LOC":6,"THUNG":24}',
  rules: 'VD: {"soMatHangToiThieu":3}',
  conditions: 'VD: {"minQty":2}',
  exclusionGroup: 'VD: UU-DAI-THANG-11',
  role1: 'VD: ORDER_APPROVE',
  role2: 'VD: NSX_DIRECTOR',
  scopeId: 'VD: 2 (mã NPP), SOUTH (miền) hoặc ALL (toàn bộ)',
  cron: 'VD: 0 0 8 * * * (8 giờ mỗi ngày)',
  topic: 'VD: Bao bì sản phẩm',
  message: 'VD: Liên hệ xác nhận nhu cầu bổ sung hàng tuần tới',
  groupName: 'VD: Cửa hàng tiện lợi',
  quantity: 'VD: 12',
  recipient: 'VD: ke.toan@synera.vn',
  bankAccount: 'VD: 0123456789',
  bankName: 'VD: Vietcombank',
};
export function inputExample(field: InputField): string {
  const { key, label, type } = field;
  if (type === 'password' || /password/i.test(key))
    return 'Nhập mật khẩu theo yêu cầu của hệ thống';
  if (type === 'date') return 'Chọn ngày theo định dạng ngày/tháng/năm';
  if (type === 'datetime-local') return 'Chọn ngày/tháng/năm và giờ:phút';
  if (type === 'time') return 'VD: 08:30';
  if (type === 'month') return 'Chọn tháng/năm, VD: 11/2026';
  if (examples[key]) return examples[key];
  if (type === 'email' || /email|username/i.test(key)) return examples.email;
  if (type === 'tel' || /phone/i.test(key)) return examples.phone;
  if (type === 'number') {
    let amount = /amount|limit|budget|price|delta|credit/i.test(key)
      ? 1500000
      : /percent|rate/i.test(key)
        ? 5
        : /days|sequence|weekday/i.test(key)
          ? 1
          : 12;
    if (field.min !== undefined && Number.isFinite(Number(field.min)))
      amount = Math.max(amount, Number(field.min));
    if (field.max !== undefined && Number.isFinite(Number(field.max)))
      amount = Math.min(amount, Number(field.max));
    return `VD: ${amount}`;
  }
  const name = label.toLocaleLowerCase('vi');
  if (/json|cấu hình/.test(name)) return 'VD: {} — nhập đúng cấu trúc được hướng dẫn';
  if (/mã vai trò/.test(name)) return 'VD: SALES_SOUTH';
  if (/mã|code/i.test(key + name)) return 'VD: SYNERA-PN-01';
  if (key === 'name') {
    if (/sản phẩm|hàng hóa|mặt hàng/.test(name)) return 'VD: Nước khoáng thiên nhiên';
    if (/tuyến/.test(name)) return 'VD: Tuyến Phú Nhuận buổi sáng';
    if (/nhân viên|họ tên|tài khoản/.test(name)) return 'VD: Trần Minh Anh';
    if (/chương trình|chính sách/.test(name)) return 'VD: Ưu đãi nhập hàng tháng 11';
    if (/phân phối/.test(name)) return 'VD: Nhà phân phối Đông Phương';
    if (/đơn vị|tổ chức|vùng/.test(name)) return 'VD: Vùng bán hàng Phú Nhuận';
    return 'VD: Cửa hàng An Khang';
  }
  return `Nhập ${name.replace(/\s*\([^)]*\)/g, '')}, VD: ${/lý do|ghi chú/.test(name) ? 'Cập nhật theo thỏa thuận với khách hàng' : 'Thông tin áp dụng cho hồ sơ này'}`;
}
