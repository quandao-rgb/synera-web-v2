import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { OrganizationLinks } from './OrganizationLinks';
import { childDistributionType, distributionLevels } from '../../shared/distributionHierarchy';
import { ArrowRight, Building2, ChevronRight, Plus, Route } from 'lucide-react';
import { numberValue, record, textValue, type RecordData } from '../../shared/api';
import { Badge, Table } from '../../shared/ui';
import { money } from '../../shared/utils';
import { rows, personName, nppName, dateText, organizationKinds as kinds } from './model';
export function withinOrg(node: RecordData, id: string, nodes: RecordData[]) {
  let current: RecordData | undefined = node;
  const visited = new Set<unknown>();
  while (current && !visited.has(current.id)) {
    if (String(current.id) === id) return true;
    visited.add(current.id);
    current = nodes.find((o) => o.id === current?.parentId);
  }
  return false;
}
export function OrgTree({
  nodes,
  selected,
  onSelect,
  routes = [],
  onRoute,
  onAdd,
}: {
  nodes: RecordData[];
  selected: string;
  onSelect: (id: string) => void;
  routes?: RecordData[];
  onRoute?: (id: string) => void;
  onAdd?: (node: RecordData) => void;
}) {
  const [folded, setFolded] = useState(new Set<string>());
  const canvas = useRef<HTMLDivElement>(null);
  const regionOrder = ['SOUTH', 'NORTH', 'CENTRAL', 'MULTI', 'UNASSIGNED'];
  const regionLabels: Record<string, string> = {
    SOUTH: 'Miền Nam',
    NORTH: 'Miền Bắc',
    CENTRAL: 'Miền Trung',
    MULTI: 'Nhiều miền',
    UNASSIGNED: 'Chưa cấu hình miền',
  };
  const branchRegion = (node: RecordData) => {
    if (node.type !== 'NPP') return textValue(node.region);
    const regions = new Set(
      nodes
        .filter((child) => child.parentId === node.id && child.type === 'REGION')
        .map((child) => textValue(child.region)),
    );
    return regions.size > 1 ? 'MULTI' : [...regions][0] || 'UNASSIGNED';
  };
  const ordered = (list: RecordData[]) =>
    [...list].sort((a, b) =>
      ['NPP', 'REGION'].includes(textValue(a.type)) && a.type === b.type
        ? regionOrder.indexOf(branchRegion(a)) - regionOrder.indexOf(branchRegion(b))
        : 0,
    );
  const toggle = (id: string) =>
    setFolded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const render = (list: RecordData[], seen: Set<unknown>): React.ReactNode =>
    ordered(list)
      .filter((o) => !seen.has(o.id))
      .map((o, index, siblings) => {
        const visited = new Set(seen).add(o.id),
          id = textValue(o.id),
          children = nodes.filter((n) => n.parentId === o.id),
          assigned = routes.filter((route) => route.organizationId === o.id),
          expandable = children.length > 0 || assigned.length > 0;
        return (
          <li
            key={id}
            className={
              o.type === 'NPP' && index > 0 && branchRegion(o) !== branchRegion(siblings[index - 1])
                ? 'org-region-break'
                : undefined
            }
          >
            <div
              className={`org-node-card ${selected === id ? 'selected' : ''}`}
              data-org-key={`unit:${id}`}
              data-org-parent={o.parentId == null ? undefined : `unit:${o.parentId}`}
              data-region-group={o.type === 'NPP' ? branchRegion(o) : undefined}
            >
              {expandable && (
                <button
                  className="org-toggle"
                  aria-label={`${folded.has(id) ? 'Mở rộng' : 'Thu gọn'} ${o.name}`}
                  aria-expanded={!folded.has(id)}
                  onClick={() => toggle(id)}
                >
                  <ChevronRight size={15} />
                </button>
              )}
              <button
                className="org-select"
                aria-pressed={selected === id}
                onClick={() => onSelect(selected === id ? '' : id)}
              >
                <Building2 size={16} />
                <span>
                  {textValue(o.name)}
                  <small>
                    {o.type === 'NPP'
                      ? regionLabels[branchRegion(o)]
                      : kinds[textValue(o.type)] || 'Đơn vị bán hàng'}
                  </small>
                </span>
              </button>
              {onAdd && (
                <button
                  className="org-add"
                  aria-label={`Thêm ${kinds[childDistributionType(o.type)] || 'tuyến bán hàng'} dưới ${o.name}`}
                  onClick={() => onAdd(o)}
                >
                  <Plus size={15} />
                </button>
              )}
            </div>
            {expandable && !folded.has(id) && (
              <ul className="nsx-org-tree">
                {render(children, visited)}
                {assigned.map((route) => (
                  <li key={`route-${route.id}`}>
                    <button
                      className="org-route-card"
                      data-org-key={`route:${route.id}`}
                      data-org-parent={`unit:${id}`}
                      onClick={() => onRoute?.(textValue(route.id))}
                    >
                      <Route size={17} />
                      <span>
                        {textValue(route.name)}
                        <small>
                          {textValue(route.repName)} ·{' '}
                          {Array.isArray(route.stops) ? route.stops.length : 0} điểm bán
                        </small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      });
  return (
    <div className="org-chart">
      <div className="org-chart-tools">
        <span>Công ty sản xuất → NPP → Miền → Tỉnh/TP → Vùng bán hàng → Tuyến</span>
        <div className="toolbar">
          <button className="text-button" onClick={() => setFolded(new Set())}>
            Mở rộng tất cả
          </button>
          <button
            className="text-button"
            onClick={() =>
              setFolded(
                new Set(nodes.filter((node) => node.parentId).map((node) => textValue(node.id))),
              )
            }
          >
            Thu gọn cấp dưới
          </button>
        </div>
      </div>
      <div className="org-chart-scroll">
        <div className="org-level-labels" aria-hidden="true">
          {[...distributionLevels, 'ROUTE'].map((type) => (
            <span key={type}>
              {type === 'NSX' ? 'Công ty sản xuất' : type === 'ROUTE' ? 'Tuyến' : kinds[type]}
            </span>
          ))}
        </div>
        <div className="org-tree-canvas" ref={canvas}>
          <OrganizationLinks canvas={canvas} revision={[nodes, routes, folded]} />
          <ul className="nsx-org-tree">
            {render(
              nodes.filter((o) => !nodes.some((n) => n.id === o.parentId)),
              new Set(),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
export function ShortOrderRows({ list, data }: { list: RecordData[]; data: RecordData }) {
  const pending = list.filter(
    (o) => !rows(data, 'replacements').some((r) => r.orderId === o.id && r.status !== 'CANCELLED'),
  );
  if (!pending.length) return null;
  return (
    <Table
      rows={pending}
      columns={[
        {
          key: 'code',
          label: 'Đơn giao thiếu',
          render: (o) => (
            <Link to={`/orders?channel=sales&order=${o.id}`}>{textValue(o.code)}</Link>
          ),
        },
        { key: 'nppId', label: 'NPP xử lý', render: (o) => nppName(data, o.nppId) },
        { key: 'repId', label: 'Sales phụ trách', render: (o) => personName(data, o.repId) },
        {
          key: 'next',
          label: 'Tiếp theo',
          render: () => <span className="nsx-text-attention">Chờ NPP phản hồi phương án</span>,
        },
      ]}
    />
  );
}
export function DetailGrid({ items }: { items: [string, unknown][] }) {
  return (
    <dl className="nsx-detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value == null || value === '' ? 'Chưa cập nhật' : (value as React.ReactNode)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function DataStamp({ data }: { data: RecordData }) {
  return data.generatedAt ? (
    <footer className="nsx-data-stamp">
      <span>
        {textValue(record(data.manufacturer).name)} · {dateText(data.from)} – {dateText(data.to)}
      </span>
      <time>
        Tạm tính · Cập nhật {new Date(textValue(data.generatedAt)).toLocaleString('vi-VN')}
      </time>
    </footer>
  ) : null;
}
export function OrderRows({ list, channel }: { list: RecordData[]; channel: string }) {
  return (
    <Table
      rows={list}
      columns={[
        {
          key: 'code',
          label: 'Mã đơn',
          render: (r) => (
            <Link to={`/orders?channel=${channel}&order=${r.id}`}>{textValue(r.code)}</Link>
          ),
        },
        { key: 'date', label: 'Ngày tạo', render: (r) => dateText(r.createdAt) },
        {
          key: 'status',
          label: 'Trạng thái',
          render: (r) => <Badge status={textValue(r.status)} />,
        },
        { key: 'total', label: 'Giá trị đơn', render: (r) => money(numberValue(r.total)) },
        {
          key: 'action',
          label: 'Thao tác',
          render: (r) => (
            <Link className="text-button" to={`/orders?channel=${channel}&order=${r.id}`}>
              Mở đơn <ArrowRight size={14} />
            </Link>
          ),
        },
      ]}
    />
  );
}
export function CareRows({ list, data }: { list: RecordData[]; data: RecordData }) {
  if (!list.length)
    return <div className="nsx-compact-empty">Không có giao bù đang chờ xử lý.</div>;
  return (
    <Table
      rows={list}
      columns={[
        {
          key: 'id',
          label: 'Giao bù',
          render: (r) => <Link to={`/npp-workflow?replacement=${r.id}`}>GB-{textValue(r.id)}</Link>,
        },
        {
          key: 'status',
          label: 'Tiến độ hàng',
          render: (r) => <Badge status={textValue(r.status)} />,
        },
        { key: 'repId', label: 'Sales phụ trách', render: (r) => personName(data, r.repId) },
        { key: 'dueAt', label: 'Hạn xử lý', render: (r) => dateText(r.dueAt) },
        {
          key: 'customer',
          label: 'Chăm sóc khách',
          render: (r) => (
            <span className={r.notifiedAt ? 'nsx-text-done' : 'nsx-text-care'}>
              {r.notifiedAt ? 'Đã báo khách' : 'Chờ báo lại khách'}
            </span>
          ),
        },
      ]}
    />
  );
}
export function AppointmentRows({ list, data }: { list: RecordData[]; data: RecordData }) {
  if (!list.length)
    return <div className="nsx-compact-empty">Không có lịch hẹn trong danh sách này.</div>;
  return (
    <Table
      rows={list}
      columns={[
        { key: 'title', label: 'Nội dung hẹn', render: (r) => textValue(r.title) },
        { key: 'repId', label: 'Sales phụ trách', render: (r) => personName(data, r.repId) },
        { key: 'dueAt', label: 'Thời hạn', render: (r) => dateText(r.dueAt) },
        {
          key: 'status',
          label: 'Trạng thái',
          render: (r) => <Badge status={textValue(r.status)} />,
        },
      ]}
    />
  );
}
