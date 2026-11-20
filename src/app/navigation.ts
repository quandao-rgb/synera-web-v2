import {
  LayoutDashboard,
  ShoppingBag,
  Building2,
  Wallet,
  Package,
  Store,
  Route as RouteIcon,
  BarChart3,
  Tags,
  Headphones,
  Settings,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../shared/types';
import type { SessionUser } from '../shared/api';
import {
  IconLayoutDashboard,
  IconShoppingCart,
  IconBuildingWarehouse,
  IconAddressBook,
  IconReceipt2,
  IconChartBar,
} from '../shared/NavIcons';

export const nppNavigation = [
  { path: '/dashboard', label: 'Tổng quan', icon: IconLayoutDashboard, children: [] },
  {
    path: '/orders',
    label: 'Đơn hàng',
    icon: IconShoppingCart,
    children: ['/catalog', '/npp-workflow', '/delivery', '/policies', '/trade'],
  },
  { path: '/inventory', label: 'Kho hàng', icon: IconBuildingWarehouse, children: ['/demand'] },
  {
    path: '/crm',
    label: 'Điểm bán & CRM',
    icon: IconAddressBook,
    children: ['/engagement', '/display', '/references', '/tickets'],
  },
  { path: '/finance', label: 'Công nợ', icon: IconReceipt2, children: [] },
  { path: '/reports', label: 'Báo cáo', icon: IconChartBar, children: [] },
];

export const nppContextLinks: Record<string, [string, string][]> = {
  '/dashboard': [
    ['/npp-workflow', 'Giao bù'],
    ['/tickets', 'Yêu cầu hỗ trợ'],
    ['/settings', 'Thiết lập'],
  ],
  '/orders': [
    ['/catalog', 'Đặt hàng NSX'],
    ['/npp-workflow', 'Giao bù'],
    ['/delivery', 'Chuyến giao'],
    ['/policies', 'Chính sách bán hàng'],
  ],
  '/inventory': [
    ['/demand', 'Kế hoạch nhập'],
    ['/references?view=import', 'Nhập Excel'],
    ['/tickets', 'Yêu cầu hỗ trợ'],
  ],
  '/npp-workflow': [['/tickets', 'Yêu cầu hỗ trợ']],
  '/crm': [
    ['/engagement', 'Báo giá & chiến dịch'],
    ['/display', 'Trưng bày'],
    ['/tickets', 'Yêu cầu hỗ trợ'],
    ['/references?view=import', 'Nhập Excel'],
  ],
  '/policies': [['/trade', 'Hỗ trợ bán hàng']],
  '/trade': [['/policies', 'Chính sách bán hàng']],
};

export const nsxContextLinks: Record<string, [string, string][]> = {
  '/dashboard': [
    ['/tickets', 'Yêu cầu hãng xử lý'],
    ['/demand', 'Kế hoạch cung ứng'],
  ],
  '/network': [
    ['/engagement', 'Báo giá & chiến dịch'],
    ['/display', 'Duyệt trưng bày'],
    ['/references', 'Danh mục & nhập Excel'],
    ['/crm?view=leads', 'Cơ hội bán hàng'],
    ['/crm?view=appointments', 'Lịch hẹn'],
  ],
  '/orders': [
    ['/catalog', 'Lập đơn nhập'],
    ['/inventory', 'Kho hàng'],
    ['/delivery', 'Chuyến giao'],
    ['/npp-workflow', 'Giao bù & chăm sóc'],
  ],
  '/policies': [
    ['/inventory', 'Bảng giá & sản phẩm'],
    ['/trade', 'Hỗ trợ thị trường'],
  ],
  '/reports': [
    ['/finance', 'Công nợ & đối soát'],
    ['/exports', 'Xuất báo cáo & lịch gửi'],
  ],
  '/settings': [
    ['/network?view=organization', 'Tổ chức & vùng'],
    ['/network?view=routes', 'Tuyến & Sales'],
  ],
};

export type SidebarGroup = {
  path: string;
  label: string;
  icon: LucideIcon | typeof IconLayoutDashboard;
  items: [string, string][];
  aliases?: string[];
};
export const nsxSidebarNavigation: SidebarGroup[] = [
  {
    path: '/dashboard',
    label: 'Điều hành',
    icon: LayoutDashboard,
    items: [['/dashboard', 'Điều hành hôm nay'], ...nsxContextLinks['/dashboard']],
  },
  {
    path: '/network',
    label: 'Mạng lưới',
    icon: Building2,
    aliases: ['/partners', '/routes'],
    items: [
      ['/network?view=npps', 'Nhà phân phối'],
      ['/network?view=stores', 'Điểm bán'],
      ['/network?view=organization', 'Tổ chức & vùng'],
      ['/network?view=routes', 'Tuyến bán hàng'],
      ...nsxContextLinks['/network'],
    ],
  },
  {
    path: '/orders',
    label: 'Đơn hàng',
    icon: ShoppingBag,
    items: [['/orders', 'Danh sách đơn hàng'], ...nsxContextLinks['/orders']],
  },
  {
    path: '/policies',
    label: 'Chính sách',
    icon: Tags,
    items: [
      ['/policies', 'Chính sách & ưu đãi'],
      ['/trade', 'Hỗ trợ thị trường'],
    ],
  },
  {
    path: '/reports',
    label: 'Báo cáo',
    icon: BarChart3,
    items: [['/reports', 'Đi tuyến & bán hàng'], ...nsxContextLinks['/reports']],
  },
  {
    path: '/settings',
    label: 'Thiết lập',
    icon: Settings,
    items: [['/settings', 'Quản trị hệ thống']],
  },
];
export const nppSidebarNavigation: SidebarGroup[] = [
  {
    path: '/dashboard',
    label: 'Tổng quan',
    icon: IconLayoutDashboard,
    items: [['/dashboard', 'Tổng quan']],
  },
  {
    path: '/orders',
    label: 'Đơn hàng',
    icon: IconShoppingCart,
    items: [
      ['/orders', 'Danh sách đơn hàng'],
      ['/catalog', 'Đặt nhập từ NSX'],
      ['/catalog?channel=sales', 'Lập đơn điểm bán'],
      ['/npp-workflow', 'Giao bù'],
      ['/delivery', 'Chuyến giao'],
      ['/delivery?view=grouping', 'Gom đơn giao hàng'],
      ['/policies', 'Chính sách bán hàng'],
      ['/trade', 'Hỗ trợ bán hàng'],
    ],
  },
  {
    path: '/inventory',
    label: 'Kho hàng',
    icon: IconBuildingWarehouse,
    items: [
      ['/inventory', 'Hàng hóa & tồn kho'],
      ['/inventory?view=risk', 'Phân phối hàng tồn'],
      ['/demand', 'Kế hoạch nhập hàng'],
    ],
  },
  {
    path: '/crm',
    label: 'Điểm bán & CRM',
    icon: IconAddressBook,
    items: [
      ['/crm?view=stores', 'Danh sách điểm bán'],
      ['/crm?view=leads', 'Cơ hội bán hàng'],
      ['/crm?view=appointments', 'Lịch hẹn'],
      ['/routes', 'Tuyến & đội ngũ'],
      ['/engagement', 'Báo giá & chiến dịch'],
      ['/display', 'Trưng bày'],
      ['/references', 'Danh mục & nhập Excel'],
      ['/tickets', 'Yêu cầu hỗ trợ'],
    ],
  },
  { path: '/finance', label: 'Công nợ', icon: IconReceipt2, items: [['/finance', 'Công nợ']] },
  {
    path: '/reports',
    label: 'Báo cáo',
    icon: IconChartBar,
    items: [
      ['/reports', 'Báo cáo bán hàng'],
      ['/exports', 'Xuất báo cáo & lịch gửi'],
    ],
  },
];
export function sidebarSelection(groups: SidebarGroup[], pathname: string, search: string) {
  const params = new URLSearchParams(search);
  let best: { group: string; href: string; score: number } | undefined;
  for (const group of groups) {
    for (const [href] of group.items) {
      const [target, query = ''] = href.split('?');
      if (target !== pathname) continue;
      const wanted = new URLSearchParams(query);
      if ([...wanted].some(([key, value]) => params.get(key) !== value)) continue;
      const score = [...wanted].length;
      if (!best || score > best.score) best = { group: group.path, href, score };
    }
  }
  if (best) return best;
  const group = groups.find((item) => item.path === pathname || item.aliases?.includes(pathname));
  return group
    ? { group: group.path, href: group.items[0]?.[0] || group.path, score: 0 }
    : undefined;
}

const routePermissions: Record<string, string[]> = {
  '/dashboard': ['REPORT_READ'],
  '/network': ['REPORT_READ'],
  '/npp-workflow': [
    'SELLIN_CREATE',
    'SALES_CREATE',
    'SALES_APPROVE',
    'WAREHOUSE_WRITE',
    'REPORT_READ',
  ],
  '/reports': ['REPORT_READ'],
  '/exports': ['REPORT_READ'],
  '/partners': ['CATALOG_WRITE', 'USER_MANAGE'],
  '/orders': ['SELLIN_CREATE', 'ORDER_APPROVE', 'SALES_CREATE', 'SALES_APPROVE', 'WAREHOUSE_WRITE'],
  '/catalog': ['SELLIN_CREATE', 'SALES_CREATE'],
  '/finance': ['CREDIT_WRITE', 'SELLIN_CREATE', 'CLOSING_WRITE'],
  '/inventory': ['WAREHOUSE_WRITE', 'CATALOG_WRITE', 'POLICY_WRITE'],
  '/crm': ['CRM_WRITE', 'ROUTE_WRITE'],
  '/routes': ['ROUTE_WRITE'],
  '/sales': ['SALES_CREATE'],
  '/policies': ['POLICY_WRITE', 'SELLIN_CREATE'],
  '/tickets': ['TICKET_WRITE'],
  '/settings': ['USER_MANAGE'],
  '/delivery': ['WAREHOUSE_WRITE', 'DELIVERY_EXECUTE'],
  '/demand': ['SELLIN_CREATE', 'ORDER_APPROVE'],
  '/trade': ['SELLIN_CREATE', 'TRADE_APPROVE', 'CREDIT_WRITE', 'TICKET_WRITE'],
  '/engagement': ['CRM_WRITE', 'ROUTE_WRITE'],
  '/display': ['SALES_CREATE', 'DISPLAY_REVIEW'],
  '/references': ['CATALOG_WRITE', 'CRM_WRITE'],
};
export function canVisit(path: string, user: SessionUser | null) {
  if (path === '/network' && (!user || user.nppId || user.role === 'SALES')) return false;
  if (path === '/sales' && user?.nppId && user.role !== 'SALES') return false;
  if (path === '/finance' && user?.role === 'ACCOUNTANT_NPP') return true;
  return (
    !!user &&
    (path === '/account' ||
      (routePermissions[path] || []).some((p) => user.authorities.includes(p)))
  );
}
export function homeRoute(user: SessionUser | null) {
  if (user?.role === 'SALES' && canVisit('/sales', user)) return '/sales';
  return Object.keys(routePermissions).find((p) => canVisit(p, user)) || '/account';
}

export const navigation: { title: string; items: [string, string, LucideIcon][] }[] = [
  {
    title: 'KINH DOANH',
    items: [
      ['/dashboard', 'Tổng quan', LayoutDashboard],
      ['/orders', 'Đơn hàng', ShoppingBag],
      ['/partners', 'Nhà phân phối', Building2],
      ['/catalog', 'Đặt hàng', Package],
      ['/finance', 'Công nợ & đối soát', Wallet],
    ],
  },
  {
    title: 'VẬN HÀNH',
    items: [
      ['/inventory', 'Kho & tồn hàng', Package],
      ['/crm', 'Cửa hàng & CRM', Store],
      ['/routes', 'Tuyến & đội ngũ', RouteIcon],
      ['/sales', 'Sales · Hôm nay', CalendarDays],
      ['/delivery', 'Chuyến giao', RouteIcon],
      ['/demand', 'Kế hoạch nhập', CalendarDays],
      ['/engagement', 'Báo giá & chiến dịch', Store],
      ['/display', 'Ảnh trưng bày', Package],
    ],
  },
  {
    title: 'QUẢN LÝ',
    items: [
      ['/reports', 'Báo cáo & chỉ tiêu', BarChart3],
      ['/policies', 'Chính sách & ưu đãi', Tags],
      ['/tickets', 'Trung tâm hỗ trợ', Headphones],
      ['/settings', 'Quản trị hệ thống', Settings],
      ['/trade', 'Hỗ trợ thị trường', Tags],
      ['/references', 'Danh mục & nhập Excel', Package],
    ],
  },
];
export const roleLabels: Record<Role, string> = {
  nsx: 'Điều hành Nhà sản xuất',
  npp: 'Nhà phân phối',
  sales: 'Nhân viên thị trường',
};
