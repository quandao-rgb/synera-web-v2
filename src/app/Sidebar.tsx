import { useCallback, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  HelpCircle,
  ArrowUpRight,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Globe,
  ArrowRightLeft,
  LayoutDashboard,
  ShoppingBag,
  Tags,
  BarChart3,
  Settings,
} from 'lucide-react';
import {
  navigation,
  nppSidebarNavigation,
  nsxSidebarNavigation,
  canVisit,
  homeRoute,
} from './navigation';
import { SidebarSections } from './SidebarSections';
import { useStore } from '../shared/store';
import { Brand } from '../shared/Brand';
import { useDrawer } from '../shared/hooks/useDrawer';
import { useSidebarMotion } from '../shared/hooks/useSidebarMotion';

type Props = {
  mobile: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onModal: (name: string) => void;
};
export function Sidebar({ mobile, collapsed, onClose, onCollapse, onModal }: Props) {
  const { db, role, user } = useStore();
  const location = useLocation();
  const nav = useRef<HTMLElement>(null);
  const marker = useSidebarMotion(nav, `${role}:${location.pathname}:${location.search}`);
  const close = useCallback(onClose, [onClose]);
  const ref = useDrawer(mobile, close);
  const pending = db.orders.filter((o) =>
    ['PENDING_APPROVAL', 'ON_HOLD_CREDIT'].includes(o.status),
  ).length;
  return (
    <>
      <aside
        ref={ref}
        tabIndex={-1}
        aria-label="Menu quản trị"
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        className={`sidebar ${mobile ? 'open' : ''}`}
      >
        <div className="sidebar-brand-row">
          <NavLink
            className="brand"
            to={homeRoute(user)}
            aria-label="SYNERA · Tổng quan"
            onClick={onClose}
          >
            <Brand />
          </NavLink>
          <button className="icon-button drawer-close" aria-label="Đóng menu" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <button
          className="workspace"
          title="Chọn không gian làm việc"
          onClick={() => onModal('workspace')}
        >
          <span className="workspace-icon">
            <Building2 size={18} />
          </span>
          <span>
            <strong>Không gian SYNERA</strong>
            <small>
              {role === 'npp'
                ? db.partners.find((p) => p.id === String(user?.nppId))?.name ||
                  `NPP ${user?.nppId}`
                : role === 'sales'
                  ? 'Đội ngũ bán hàng'
                  : 'Hệ thống phân phối'}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav ref={nav} aria-label="Điều hướng chính">
          <span ref={marker} className="nav-slider" aria-hidden="true" hidden />
          {role === 'npp' || role === 'nsx' ? (
            <div className={role === 'npp' ? 'npp-primary-nav' : 'nsx-primary-nav'}>
              <SidebarSections
                groups={role === 'npp' ? nppSidebarNavigation : nsxSidebarNavigation}
                user={user}
                collapsed={collapsed}
                mobile={mobile}
                onClose={onClose}
              />
            </div>
          ) : (
            <>
              {canVisit('/npp-workflow', user) && (
                <NavLink
                  to="/npp-workflow"
                  onClick={onClose}
                  title="Trung tâm phối hợp"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <ArrowRightLeft size={19} />
                  <span>Trung tâm phối hợp</span>
                </NavLink>
              )}
              {navigation.map((group) => (
                <div className="nav-group" key={group.title}>
                  <p>{group.title}</p>
                  {group.items
                    .filter((i) => canVisit(i[0], user))
                    .map(([path, label, Icon]) => (
                      <NavLink
                        key={path}
                        to={path}
                        title={label}
                        onClick={onClose}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={19} />
                        <span>{label}</span>
                        {path === '/orders' && pending > 0 && <b>{pending}</b>}
                        {path === '/sales' && <span className="nav-new">PWA</span>}
                      </NavLink>
                    ))}
                </div>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          {role !== 'npp' && (
            <NavLink
              to="/landing"
              className="sidebar-help"
              title="Website SYNERA"
              onClick={onClose}
            >
              <Globe size={18} />
              <span>Website SYNERA</span>
              <ArrowUpRight size={14} />
            </NavLink>
          )}
          <button
            className="sidebar-help"
            title="Trợ giúp & hướng dẫn"
            onClick={() => onModal('help')}
          >
            <HelpCircle size={18} />
            <span>Trợ giúp & hướng dẫn</span>
            <ArrowUpRight size={14} />
          </button>
          <button
            className="collapse-control"
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            aria-expanded={!collapsed}
            onClick={onCollapse}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            <span>Thu gọn menu</span>
          </button>
          {role !== 'npp' && (
            <div className="sidebar-version">
              <Layers size={13} />
              <span>Không gian SYNERA</span>
              <span>v1.0</span>
            </div>
          )}
        </div>
      </aside>
      {mobile && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
    </>
  );
}
