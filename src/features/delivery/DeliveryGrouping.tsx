import { useState } from 'react';
import { Layers3, ArrowRight, Check, Route, Plus, PackageCheck, ClockAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../../shared/hooks/useApi';
import { command, record, textValue, numberValue, type RecordData } from '../../shared/api';
import { PageHead, Panel, Table, Modal } from '../../shared/ui';
import { LoadState } from '../../shared/ApiUI';
import { today } from '../../shared/utils';
import { deliveryGroups } from '../../shared/deliveryPlanning';

const dateLabel = (value: string) =>
  value ? new Date(value + 'T12:00:00').toLocaleDateString('vi-VN') : 'Chưa hẹn';
export default function DeliveryGrouping({
  name,
  nppId,
  onExit,
  onManual,
  onCreated,
}: {
  name: string;
  nppId: number;
  onExit: () => void;
  onManual: () => void;
  onCreated: (id: string) => void;
}) {
  const ready = useApi<RecordData[]>(`/delivery-trips/ready?nppId=${nppId}`, []);
  const staff = useApi<RecordData[]>(`/staff?nppId=${nppId}&role=DRIVER`, []);
  const trips = useApi<RecordData[]>('/delivery-trips', []);
  const routes = useApi<RecordData[]>('/routes', []);
  const [selected, setSelected] = useState<number[] | null>(null);
  const [date, setDate] = useState(''),
    [driver, setDriver] = useState('');
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const groups = deliveryGroups(ready.data, today());
  const ids = selected ?? groups[0]?.orders.map((o) => numberValue(o.id)) ?? [];
  const chosen = ready.data.filter((o) => ids.includes(numberValue(o.id)));
  const active = groups.findIndex(
    (g) =>
      g.orders.length === chosen.length && g.orders.every((o) => ids.includes(numberValue(o.id))),
  );
  const due = chosen
    .map((o) => textValue(o.expectedDelivery))
    .filter(Boolean)
    .sort()[0];
  const deliveryDate = date || (due && due > today() ? due : today());
  const valid =
    chosen.length > 0 &&
    deliveryDate >= today() &&
    (!due || deliveryDate <= (due < today() ? today() : due));
  const urgent = ready.data.filter(
    (o) =>
      o.expectedDelivery &&
      textValue(o.expectedDelivery) <= today() &&
      !ids.includes(numberValue(o.id)),
  );
  const routeName = (o: RecordData) =>
    textValue(routes.data.find((r) => r.id === record(o.store).routeId)?.name);
  const cluster = [...new Set(chosen.map(routeName).filter(Boolean))].join(' · ');
  const choose = (index: number) => {
    const group = groups[index];
    if (!group) return;
    setSelected(group.orders.map((o) => numberValue(o.id)));
    setDate(group.date);
    setError('');
  };
  async function create() {
    if (busy || !valid || !driver || ready.error) return;
    setBusy(true);
    setError('');
    try {
      const result = await command('/delivery-trips', {
        nppId,
        driverId: Number(driver),
        deliveryDate,
        stops: chosen.map((o) => ({ channel: 'SELL_OUT', orderId: o.id })),
      });
      setConfirm(false);
      onCreated(textValue(result.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lập được chuyến.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="npp-planning-preview">
      <PageHead
        title="Chuyến giao hàng"
        description="Gom đơn đã chuẩn bị xong theo tuyến và ngày hẹn để giao cùng chuyến."
      >
        <button className="btn" onClick={onManual}>
          <Plus size={17} /> Lập chuyến giao
        </button>
        <button
          className="btn primary"
          onClick={() => choose(0)}
          disabled={ready.loading || !!ready.error || !groups.length}
        >
          <Layers3 size={17} /> Gom đơn hàng
        </button>
      </PageHead>
      <p className="planning-scope">
        <strong>{name}</strong>
      </p>
      <div className="tabs planning-tabs">
        <button className="active">
          Đơn sẵn sàng <span>{ready.data.length}</span>
        </button>
        <button onClick={onExit}>
          Chuyến đã lập <span>{trips.data.length}</span>
        </button>
      </div>
      <LoadState {...ready} retry={ready.reload} />
      <div className="planning-columns delivery-planning-columns">
        <Panel
          className="planning-panel"
          title="Đơn chờ xếp chuyến"
          subtitle="Đã duyệt, hàng đã xuất kho và chưa được xếp chuyến"
          action={<span className="planning-chip">{chosen.length} đơn đã chọn</span>}
        >
          <Table
            rows={ready.data}
            pageSize={10}
            columns={[
              {
                key: 'order',
                label: 'Đơn hàng / Điểm bán',
                render: (o) => (
                  <label className="planning-order-choice">
                    <input
                      type="checkbox"
                      aria-label={`Chọn đơn ${textValue(o.code)}`}
                      checked={ids.includes(numberValue(o.id))}
                      onChange={(e) => {
                        setSelected(
                          e.target.checked
                            ? [...ids, numberValue(o.id)]
                            : ids.filter((id) => id !== numberValue(o.id)),
                        );
                        setDate('');
                      }}
                    />
                    <span>
                      <strong>{textValue(o.code)}</strong>
                      <span>{textValue(record(o.store).name)}</span>
                    </span>
                  </label>
                ),
              },
              {
                key: 'area',
                label: 'Khu vực / Tuyến',
                render: (o) => (
                  <span className="planning-stack">
                    <span>{routeName(o) || 'Chưa gán tuyến'}</span>
                    <small>{textValue(record(o.store).address) || 'Chưa có địa chỉ'}</small>
                  </span>
                ),
              },
              {
                key: 'date',
                label: 'Ngày giao đã hẹn',
                render: (o) => (
                  <span
                    className={
                      o.expectedDelivery && textValue(o.expectedDelivery) <= today()
                        ? 'planning-warning-text'
                        : ''
                    }
                  >
                    {dateLabel(textValue(o.expectedDelivery))}
                  </span>
                ),
              },
              {
                key: 'urgent',
                label: 'Ưu tiên',
                render: (o) =>
                  o.expectedDelivery && textValue(o.expectedDelivery) <= today() ? (
                    <span className="planning-chip warning">
                      {textValue(o.expectedDelivery) < today() ? 'Quá hẹn' : 'Hôm nay'}
                    </span>
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
            <span>{ready.data.length} đơn chờ</span>
          </div>
          {!ready.loading && !ready.error && !ready.data.length && (
            <p className="planning-body planning-explanation">
              Đơn bán sẽ xuất hiện ở đây sau khi được duyệt và xuất kho. Các đơn đang thuộc chuyến
              khác được giữ tại Chuyến đã lập.
            </p>
          )}
        </Panel>
        <Panel
          className="planning-panel"
          title="Đề xuất gom đơn"
          action={
            <span className="planning-muted">
              {groups.length
                ? `${active >= 0 ? active + 1 : 'Tùy chọn'} / ${groups.length} cụm`
                : '0 cụm'}
            </span>
          }
        >
          <div className="planning-body">
            <div className="planning-summary">
              <Route size={20} />
              <div>
                <h3>{cluster || (chosen.length ? 'Cụm giao đã chọn' : 'Chưa có đơn để gom')}</h3>
                <p>
                  {chosen.length} đơn · {new Set(chosen.map((o) => o.storeId)).size} điểm bán
                </p>
              </div>
            </div>
            <label className="planning-date-label">
              Hẹn ngày giao chung
              <input
                aria-label="Ngày giao chung"
                type="date"
                min={today()}
                max={due ? (due < today() ? today() : due) : undefined}
                value={deliveryDate}
                disabled={!chosen.length}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <p className="planning-explanation">
              {due
                ? `Giao không muộn hơn ${dateLabel(due < today() ? today() : due)}. `
                : 'Có đơn chưa hẹn ngày: xác nhận lịch nhận với điểm bán. '}
              Cụm đề xuất dựa trên cùng tuyến hoặc tọa độ cách điểm đầu tối đa 3 km.
            </p>
            {urgent.length > 0 && (
              <div className="planning-alert warning">
                <ClockAlert size={20} />
                <div>
                  <strong>{urgent.length} đơn cần giao ngay chưa được chọn</strong>
                  <p>Giữ lịch giao hôm nay; không lùi ngày để ghép chuyến.</p>
                  <button
                    className="planning-text-button"
                    onClick={() =>
                      choose(groups.findIndex((g) => g.orders.some((o) => o.id === urgent[0].id)))
                    }
                  >
                    Xem cụm cần giao ngay
                  </button>
                </div>
              </div>
            )}
            {due && due < today() && (
              <p className="planning-alert warning">
                Có đơn đã quá hẹn. Liên hệ điểm bán và ưu tiên giao hôm nay.
              </p>
            )}
            <div className="planning-trip-comparison">
              <span>So với giao từng đơn</span>
              <strong>
                {chosen.length} → {chosen.length ? 1 : 0} chuyến
              </strong>
            </div>
            <button
              className="btn primary planning-full"
              disabled={!valid || ready.loading || !!ready.error}
              onClick={() => setConfirm(true)}
            >
              <Check size={17} /> Chốt ngày & lập chuyến
            </button>
            {groups.length > 1 && (
              <button
                className="planning-next"
                onClick={() => choose((active + 1) % groups.length)}
              >
                Xem cụm tiếp theo <ArrowRight size={17} />
              </button>
            )}
            <p className="planning-explanation">
              Kiểm tra đường đi, tải trọng và khả năng nhận hàng trước khi chốt chuyến.
            </p>
          </div>
        </Panel>
      </div>
      {confirm && (
        <Modal
          title="Xác nhận lập chuyến giao"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <div className="planning-body">
            <p>
              <strong>
                {chosen.length} đơn · {dateLabel(deliveryDate)}
              </strong>
            </p>
            <ul className="planning-confirm-list">
              {chosen.map((o) => (
                <li key={numberValue(o.id)}>
                  {textValue(record(o.store).name)} · {textValue(o.code)}
                </li>
              ))}
            </ul>
            <LoadState {...staff} retry={staff.reload} />
            <label>
              Tài xế
              <select
                aria-label="Tài xế"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                disabled={busy}
              >
                <option value="">Chọn tài xế</option>
                {staff.data
                  .filter((s) => s.role === 'DRIVER')
                  .map((s) => (
                    <option key={textValue(s.id)} value={textValue(s.id)}>
                      {textValue(s.name)}
                    </option>
                  ))}
              </select>
            </label>
            {!staff.loading && !staff.error && !staff.data.some((s) => s.role === 'DRIVER') && (
              <p className="planning-explanation">
                Chưa có tài xế trong NPP. Thêm tài xế tại Tuyến & đội ngũ rồi quay lại lập chuyến.{' '}
                <Link to="/routes">Mở Tuyến & đội ngũ</Link>
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="btn primary planning-full"
              disabled={busy || !driver || !valid || !!staff.error || !!ready.error}
              onClick={() => void create()}
            >
              {busy ? 'Đang lưu…' : 'Lập chuyến giao'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
