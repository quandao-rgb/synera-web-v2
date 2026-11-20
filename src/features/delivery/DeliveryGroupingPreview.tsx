import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClockAlert,
  Layers3,
  PackageCheck,
  Plus,
  Route,
} from 'lucide-react';
import { PageHead, Panel, Table, Modal, Empty } from '../../shared/ui';
import {
  readyOrders,
  suggestDeliveryGroups,
  commonDeliveryWindow,
  canPlanDelivery,
  shortDate,
  fullDate,
} from '../portal-npp/planningPreview';

type PlannedTrip = { id: string; date: string; cluster: string; orderIds: string[] };
export default function DeliveryGroupingPreview({
  name,
  onExit,
}: {
  name: string;
  onExit: () => void;
}) {
  const [trips, setTrips] = useState<PlannedTrip[]>([]),
    [tab, setTab] = useState('ready');
  const [selectedIds, setSelectedIds] = useState(['DH-101', 'DH-102', 'DH-103']);
  const [date, setDate] = useState('2026-11-17'),
    [confirm, setConfirm] = useState(false);
  const used = new Set(trips.flatMap((t) => t.orderIds));
  const available = readyOrders.filter((o) => o.ready && !used.has(o.id));
  const groups = suggestDeliveryGroups(available);
  const selected = available.filter((o) => selectedIds.includes(o.id));
  const window = commonDeliveryWindow(selected);
  const valid = canPlanDelivery(selected, date);
  const activeGroup = groups.findIndex(
    (g) => g.orders.every((o) => selectedIds.includes(o.id)) && g.orders.length === selected.length,
  );
  const urgent = available.filter((o) => o.urgent && !selectedIds.includes(o.id));
  function choose(index: number) {
    const group = groups[index];
    if (!group) return;
    setSelectedIds(group.orders.map((o) => o.id));
    setDate(group.date);
    setTab('ready');
  }
  function createPreview() {
    if (!valid) return;
    const ids = selected.map((o) => o.id);
    setTrips((previous) =>
      previous.some((t) => t.orderIds.some((id) => ids.includes(id)))
        ? previous
        : [
            ...previous,
            {
              id: `CG-MH-${String(previous.length + 1).padStart(2, '0')}`,
              date,
              cluster: selected[0].cluster,
              orderIds: ids,
            },
          ],
    );
    setSelectedIds([]);
    setConfirm(false);
    setTab('trips');
  }
  return (
    <div className="npp-planning-preview">
      <button className="planning-back" onClick={onExit}>
        <ArrowLeft size={15} /> Chuyến giao đang vận hành
      </button>
      <PageHead title="Chuyến giao hàng">
        <button className="btn" disabled={!valid} onClick={() => setConfirm(true)}>
          <Plus size={17} /> Lập chuyến giao
        </button>
        <button className="btn primary" disabled={!groups.length} onClick={() => choose(0)}>
          <Layers3 size={17} /> Gom đơn hàng
        </button>
      </PageHead>
      <p className="planning-scope">
        <Building2 size={16} />
        <strong>{name}</strong>
        <span>· Dữ liệu minh họa</span>
      </p>
      <div className="tabs planning-tabs" role="tablist" aria-label="Chuyến giao minh họa">
        <button
          role="tab"
          aria-selected={tab === 'ready'}
          className={tab === 'ready' ? 'active' : ''}
          onClick={() => setTab('ready')}
        >
          Đơn sẵn sàng <span>{available.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'trips'}
          className={tab === 'trips' ? 'active' : ''}
          onClick={() => setTab('trips')}
        >
          Chuyến đã lập <span>{trips.length}</span>
        </button>
      </div>
      {tab === 'ready' ? (
        <div className="planning-columns delivery-planning-columns">
          <Panel
            className="planning-panel planning-order-list"
            title="Đơn chờ xếp chuyến"
            subtitle="Đã duyệt, hàng đã chuẩn bị xong"
            action={<span className="planning-chip">{selected.length} đơn đã chọn</span>}
          >
            <Table
              rows={available}
              pagination={false}
              pageSize={20}
              columns={[
                {
                  key: 'order',
                  label: 'Đơn hàng / Điểm bán',
                  render: (o) => (
                    <label className="planning-order-choice">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${o.id}`}
                        checked={selectedIds.includes(o.id)}
                        onChange={(e) =>
                          setSelectedIds((old) =>
                            e.target.checked ? [...old, o.id] : old.filter((id) => id !== o.id),
                          )
                        }
                      />
                      <span>
                        <strong>{o.id}</strong>
                        <span>{o.store}</span>
                      </span>
                    </label>
                  ),
                },
                { key: 'area', label: 'Khu vực', render: (o) => o.area },
                {
                  key: 'date',
                  label: 'Ngày có thể giao',
                  render: (o) => (
                    <span className={o.urgent ? 'planning-warning-text' : ''}>
                      {o.from === o.to
                        ? shortDate(o.from)
                        : `${shortDate(o.from)} – ${shortDate(o.to)}`}
                    </span>
                  ),
                },
                {
                  key: 'priority',
                  label: 'Ưu tiên',
                  render: (o) =>
                    o.urgent ? (
                      <span className="planning-chip warning">Gấp</span>
                    ) : (
                      <span className="planning-muted">Thường</span>
                    ),
                },
              ]}
            />
            <div className="planning-panel-foot">
              <span>
                <PackageCheck size={17} /> Đơn sẵn sàng tự vào danh sách
              </span>
              <span>{available.length} đơn chờ</span>
            </div>
          </Panel>
          <Panel
            className="planning-panel planning-proposal"
            title="Đề xuất gom đơn"
            action={
              <span className="planning-muted">
                {activeGroup >= 0 ? activeGroup + 1 : '—'} / {groups.length} cụm
              </span>
            }
          >
            <div className="planning-body">
              <div className="planning-summary">
                <Route size={21} />
                <div>
                  <h3>
                    {selected.length
                      ? new Set(selected.map((o) => o.cluster)).size === 1
                        ? selected[0].cluster
                        : 'Nhiều khu vực khác tuyến'
                      : 'Chọn đơn để lập chuyến'}
                  </h3>
                  <p>
                    {selected.length} đơn · {new Set(selected.map((o) => o.store)).size} điểm bán
                  </p>
                </div>
              </div>
              <label className="planning-date-label">
                Hẹn ngày giao chung
                <input
                  aria-label="Ngày giao chung"
                  type="date"
                  value={date}
                  min={window.valid ? window.from : undefined}
                  max={window.valid ? window.to : undefined}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {valid ? (
                <p className="planning-explanation">
                  Các điểm bán gần tuyến và đều nhận được ngày này.
                </p>
              ) : selected.length > 0 ? (
                <p className="planning-alert warning" role="alert">
                  {!window.valid
                    ? 'Các đơn chưa có ngày giao chung hoặc thuộc khu vực khác tuyến. Hãy tách thành các chuyến phù hợp.'
                    : 'Ngày đã chọn nằm ngoài thời gian có thể nhận hàng. Giữ đúng hạn của đơn gấp.'}
                </p>
              ) : (
                <p className="planning-explanation">
                  Chọn các đơn cùng khu vực và có thời gian nhận hàng phù hợp.
                </p>
              )}
              {urgent.length > 0 && (
                <div className="planning-alert warning">
                  <ClockAlert size={22} />
                  <div>
                    <strong>
                      {urgent.length} đơn gấp giữ ngày giao {shortDate(urgent[0].to)}
                    </strong>
                    <p>Xếp chuyến riêng để kịp lịch.</p>
                    <button
                      className="planning-text-button"
                      onClick={() => {
                        setSelectedIds([urgent[0].id]);
                        setDate(urgent[0].to);
                      }}
                    >
                      Xem đơn gấp
                    </button>
                  </div>
                </div>
              )}
              <div className="planning-trip-comparison">
                <span>So với giao từng đơn</span>
                <strong>
                  {selected.length || 0} → {selected.length ? 1 : 0} chuyến
                </strong>
              </div>
              <button
                className="btn primary planning-full"
                disabled={!valid}
                onClick={() => setConfirm(true)}
              >
                <Check size={17} /> Chốt ngày & lập chuyến
              </button>
              {groups.length > 0 && (
                <button
                  className="planning-next"
                  onClick={() => choose((Math.max(activeGroup, 0) + 1) % groups.length)}
                >
                  Xem cụm {groups[(Math.max(activeGroup, 0) + 1) % groups.length].name}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </Panel>
        </div>
      ) : (
        <Panel
          className="planning-panel"
          title="Chuyến đã lập trong bản mô phỏng"
          subtitle="Các đơn đã xếp chuyến không xuất hiện lại trong danh sách chờ"
        >
          {trips.length ? (
            <Table
              pagination={false}
              rows={trips}
              columns={[
                { key: 'id', label: 'Chuyến giao', render: (t) => <strong>{t.id}</strong> },
                { key: 'cluster', label: 'Khu vực', render: (t) => t.cluster },
                { key: 'date', label: 'Ngày giao', render: (t) => fullDate(t.date) },
                { key: 'orders', label: 'Đơn trong chuyến', render: (t) => t.orderIds.join(', ') },
                {
                  key: 'status',
                  label: 'Trạng thái',
                  render: () => <span className="planning-chip">Chờ xuất phát · Minh họa</span>,
                },
              ]}
            />
          ) : (
            <Empty text="Chưa lập chuyến minh họa. Chọn các đơn sẵn sàng để bắt đầu." />
          )}
        </Panel>
      )}
      <p className="planning-disclaimer">
        Bản mô phỏng để duyệt giao diện. Chưa lưu chuyến hoặc thay đổi đơn hàng đang vận hành.
      </p>
      {confirm && (
        <Modal title="Xác nhận chuyến giao minh họa" onClose={() => setConfirm(false)}>
          <div className="planning-dialog-body">
            <div className="planning-summary">
              <CalendarDays size={22} />
              <div>
                <h3>{fullDate(date)}</h3>
                <p>
                  {selected[0]?.cluster} · {selected.length} đơn
                </p>
              </div>
            </div>
            <ul className="planning-confirm-list">
              {selected.map((o) => (
                <li key={o.id}>
                  <strong>{o.id}</strong> {o.store}
                </li>
              ))}
            </ul>
            <p className="planning-explanation">
              Các đơn được gom thành một chuyến trong bản mô phỏng; chưa gửi lệnh giao thật.
            </p>
            <div className="planning-dialog-actions">
              <button className="btn" onClick={() => setConfirm(false)}>
                Quay lại
              </button>
              <button className="btn primary" disabled={!valid} onClick={createPreview}>
                Lập chuyến minh họa
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
