import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { SessionUser } from '../shared/api';
import { canVisit, sidebarSelection, type SidebarGroup } from './navigation';

export function SidebarSections({
  groups,
  user,
  collapsed,
  mobile,
  onClose,
}: {
  groups: SidebarGroup[];
  user: SessionUser | null;
  collapsed: boolean;
  mobile: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(([href]) => canVisit(href.split('?')[0], user)),
    }))
    .filter((group) => group.items.length);
  const selection = sidebarSelection(visible, location.pathname, location.search);
  const [expanded, setExpanded] = useState(selection?.group || ''),
    [flyout, setFlyout] = useState(''),
    [top, setTop] = useState(80),
    [tablet, setTablet] = useState(
      () => matchMedia('(min-width: 761px) and (max-width: 1100px)').matches,
    );
  const container = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null);
  const compact = !mobile && (collapsed || tablet);
  useEffect(() => {
    const media = matchMedia('(min-width: 761px) and (max-width: 1100px)');
    const update = () => {
      setTablet(media.matches);
      setFlyout('');
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    setExpanded(selection?.group || '');
    setFlyout('');
  }, [location.pathname, location.search, selection?.group]);
  useEffect(() => {
    setFlyout('');
  }, [collapsed]);
  useEffect(() => {
    if (!flyout) return;
    const outside = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !container.current?.querySelector(`[data-section="${flyout}"]`)?.contains(event.target)
      )
        setFlyout('');
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFlyout('');
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [flyout]);
  return (
    <div ref={container} className="sidebar-sections">
      {visible.map((group) => {
        const Icon = group.icon,
          active = selection?.group === group.path;
        if (group.items.length === 1 && group.items[0][0] === group.path)
          return (
            <Link
              key={group.path}
              to={group.path}
              onClick={onClose}
              title={group.label}
              className={`nav-link ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={21} />
              <span>{group.label}</span>
            </Link>
          );
        const open = compact ? flyout === group.path : expanded === group.path;
        const id = 'sidebar-section-' + group.path.slice(1);
        return (
          <div
            className={`sidebar-nav-group ${compact ? 'compact' : ''}`}
            data-section={group.path}
            key={group.path}
          >
            <button
              type="button"
              className={`nav-link sidebar-parent ${active ? 'active' : ''}`}
              title={group.label}
              aria-expanded={open}
              aria-controls={id}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                if (compact) {
                  setTop(
                    Math.max(
                      12,
                      Math.min(event.currentTarget.getBoundingClientRect().top, innerHeight - 330),
                    ),
                  );
                  setFlyout(open ? '' : group.path);
                } else setExpanded(open ? '' : group.path);
              }}
            >
              <Icon size={21} />
              <span>{group.label}</span>
              <ChevronDown size={15} className="sidebar-chevron" />
            </button>
            <div
              id={id}
              className={`sidebar-submenu ${open ? 'expanded' : ''}`}
              style={compact ? { top } : undefined}
              {...(!open ? { inert: '' } : {})}
            >
              <div className="sidebar-submenu-inner">
                {compact && <strong className="sidebar-submenu-title">{group.label}</strong>}
                {group.items.map(([href, label]) => (
                  <Link
                    key={href}
                    to={href}
                    className={`sidebar-child ${selection?.href === href ? 'active' : ''}`}
                    aria-current={selection?.href === href ? 'page' : undefined}
                    onClick={() => {
                      setFlyout('');
                      onClose();
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
