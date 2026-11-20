import { useState } from 'react';
import { CalendarDays, CheckCircle2, FilePlus2, Phone, Store, TrendingDown } from 'lucide-react';
import { Empty, Modal, Panel, Table } from '../../shared/ui';
import { money } from '../../shared/utils';
import { productImage } from '../../shared/productMedia';
import {
  forecastLot,
  fullDate,
  previewDate,
  riskLots,
  targetBuyers,
  type BuyerHistory,
} from './planningPreview';

type Agreement = { qty: number; price: number; note: string };
type Draft = Agreement & {
  id: string;
  lotId: string;
  store: string;
  product: string;
  unit: string;
};
export default function StockRiskPreview() {
  const [lotId, setLotId] = useState(riskLots[0].id),
    [storeId, setStoreId] = useState('s1');
  const [contact, setContact] = useState<BuyerHistory | null>(null),
    [draftDialog, setDraftDialog] = useState(false);
  const [qty, setQty] = useState('60'),
    [price, setPrice] = useState('18000'),
    [note, setNote] = useState('');
  const [error, setError] = useState(''),
    [agreements, setAgreements] = useState<Record<string, Agreement>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const lot = riskLots.find((l) => l.id === lotId)!,
    forecast = forecastLot(lot),
    buyers = targetBuyers(lot);
  const buyer = buyers.find((b) => b.id === storeId) || buyers[0];
  const key = `${lot.id}:${buyer?.id}`,
    agreement = agreements[key],
    draft = drafts[key];
  const percent = forecast.available ? (forecast.expectedSold / forecast.available) * 100 : 0;
  function selectLot(id: string) {
    setLotId(id);
    setStoreId('s1');
    setError('');
  }
  function openContact(b: BuyerHistory) {
    setStoreId(b.id);
    setContact(b);
    setError('');
    const saved = agreements[`${lot.id}:${b.id}`];
    setQty(String(saved?.qty ?? Math.min(b.qty30, forecast.surplus || forecast.available)));
    setPrice(String(saved?.price ?? lot.price));
    setNote(saved?.note || '');
  }
  function saveAgreement() {
    const quantity = Number(qty),
      unitPrice = Number(price);
    const otherQuantity = Object.entries(agreements).reduce(
      (s, [id, a]) => s + (id.startsWith(lot.id + ':') && id !== key ? a.qty : 0),
      0,
    );
    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity + otherQuantity > forecast.available ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      setError(
        'Kiểm tra số lượng nguyên dương, tổng lượng trao đổi không vượt tồn khả dụng và đơn giá lớn hơn 0.',
      );
      return;
    }
    setAgreements((old) => ({ ...old, [key]: { qty: quantity, price: unitPrice, note } }));
    // Editing an agreement invalidates only its unsent, in-memory mockup draft.
    setDrafts((old) => Object.fromEntries(Object.entries(old).filter(([id]) => id !== key)));
    setContact(null);
  }
  function createDraft() {
    if (!agreement || !buyer || draft) return;
    setDrafts((old) =>
      old[key]
        ? old
        : {
            ...old,
            [key]: {
              ...agreement,
              id: `NHAP-MH-${Object.keys(old).length + 1}`,
              lotId: lot.id,
              store: buyer.name,
              product: lot.name,
              unit: lot.unit,
            },
          },
    );
    setDraftDialog(false);
  }
  return (
    <div className="npp-planning-preview stock-risk-preview">
      <div className="planning-columns stock-planning-columns">
        <Panel
          className="planning-panel planning-risk-list"
          title="Dự báo tồn theo lô"
          subtitle="Tốc độ bán trung bình trong 30 ngày gần nhất"
          action={
            <span className="planning-chip warning">
              {riskLots.filter((l) => forecastLot(l).surplus > 0).length} lô có rủi ro
            </span>
          }
        >
          <Table
            rows={riskLots}
            pagination={false}
            columns={[
              {
                key: 'product',
                label: 'Sản phẩm / Lô',
                render: (l) => (
                  <button
                    className="planning-lot-choice"
                    aria-pressed={l.id === lot.id}
                    onClick={() => selectLot(l.id)}
                  >
                    <img src={productImage(l.name)} alt="" />
                    <span>
                      <strong>{l.name}</strong>
                      <small>
                        {l.sku} · Lô {l.id}
                      </small>
                    </span>
                  </button>
                ),
              },
              {
                key: 'expiry',
                label: 'Hạn dùng',
                render: (l) => (
                  <span className="planning-stack">
                    <strong>{fullDate(l.expiry)}</strong>
                    <small>Còn {forecastLot(l).days} ngày</small>
                  </span>
                ),
              },
              {
                key: 'available',
                label: 'Tồn khả dụng',
                render: (l) => (
                  <strong>
                    {forecastLot(l).available} {l.unit}
                  </strong>
                ),
              },
              {
                key: 'daily',
                label: 'Bán TB/ngày',
                render: (l) => (
                  <span className="planning-muted">
                    {forecastLot(l).daily} {l.unit}
                  </span>
                ),
              },
              {
                key: 'risk',
                label: 'Dư tại HSD',
                render: (l) => (
                  <strong className={l.id === lot.id ? 'planning-warning-text' : ''}>
                    {forecastLot(l).surplus} {l.unit}
                  </strong>
                ),
              },
            ]}
          />
          <div className="planning-forecast">
            <h3>
              Dự báo lô {lot.id} trong {forecast.days} ngày
            </h3>
            <p>
              Với nhịp bán {forecast.daily} {lot.unit}/ngày, dự kiến còn{' '}
              <strong>
                {forecast.surplus} {lot.unit}
              </strong>{' '}
              khi đến hạn.
            </p>
            <div className="planning-stock-total">
              <span>Tồn khả dụng hiện tại</span>
              <strong>
                {forecast.available} {lot.unit}
              </strong>
            </div>
            <div
              className="planning-forecast-bar"
              role="img"
              aria-label={`Dự kiến bán ${forecast.expectedSold} ${lot.unit}, còn ${forecast.surplus} ${lot.unit} khi đến hạn`}
            >
              <span style={{ width: `${percent}%` }} />
              <span style={{ width: `${100 - percent}%` }} />
            </div>
            <div className="planning-forecast-legend">
              <span>
                <i /> Dự kiến bán {forecast.expectedSold} {lot.unit}
              </span>
              <span>
                <i /> Dự kiến còn {forecast.surplus} {lot.unit} khi đến hạn
              </span>
            </div>
            <div className="planning-forecast-date">
              <CalendarDays size={17} /> Ngày dự báo {fullDate(previewDate)}
            </div>
            <p className="planning-method">
              <TrendingDown size={16} /> Tồn khả dụng = tồn thực tế − đã giữ. Dự báo theo nhịp bán
              hiện tại, chưa phải cam kết tiêu thụ.
            </p>
          </div>
        </Panel>
        <Panel
          className="planning-panel planning-targets"
          title="Điểm bán đề xuất"
          action={<span className="planning-chip">{buyers.length} điểm bán</span>}
        >
          <div className="planning-body">
            <div className="planning-summary">
              <Store size={21} />
              <div>
                <strong>
                  Đã từng mua {lot.name} · {lot.sku}
                </strong>
                <p>Ưu tiên lượng mua và lần mua gần nhất.</p>
              </div>
            </div>
            {buyers.length ? (
              buyers.map((b) => (
                <div
                  className={`planning-buyer ${buyer?.id === b.id ? 'selected' : ''}`}
                  key={b.id}
                >
                  <div>
                    <h3>{b.name}</h3>
                    <p>
                      Mua gần nhất {fullDate(b.lastPurchase).slice(0, 5)} · {b.qty30} {lot.unit}{' '}
                      trong 30 ngày
                    </p>
                    <span className="planning-phone">{b.phone}</span>
                  </div>
                  <button
                    className="btn"
                    aria-label={`Liên hệ ${b.name}`}
                    onClick={() => openContact(b)}
                  >
                    <Phone size={16} /> Liên hệ
                  </button>
                </div>
              ))
            ) : (
              <Empty text="Chưa có điểm bán từng mua mặt hàng còn hạn này." />
            )}
            {agreement && buyer ? (
              <div className="planning-alert success">
                <CheckCircle2 size={21} />
                <div>
                  <strong>Đã trao đổi với {buyer.name}</strong>
                  <p>
                    {agreement.qty} {lot.unit} × {money(agreement.price)}/{lot.unit}
                  </p>
                  {agreement.note && <p>{agreement.note}</p>}
                </div>
              </div>
            ) : (
              <p className="planning-explanation">
                Liên hệ điểm bán và ghi nhận số lượng, giá đã trao đổi trước khi lập đơn nháp.
              </p>
            )}
            {draft ? (
              <div className="planning-alert success" role="status">
                <FilePlus2 size={21} />
                <div>
                  <strong>Đã lập {draft.id}</strong>
                  <p>
                    {draft.qty} {draft.unit} · {money(draft.qty * draft.price)}
                  </p>
                  <p>Bản nháp minh họa, chưa gửi đơn.</p>
                </div>
              </div>
            ) : (
              <button
                className="btn primary planning-full"
                disabled={!agreement || !buyer}
                onClick={() => setDraftDialog(true)}
              >
                <FilePlus2 size={18} /> Lập đơn nháp
              </button>
            )}
          </div>
        </Panel>
      </div>
      <p className="planning-disclaimer">
        Dữ liệu và trao đổi minh họa. Chưa trừ tồn, giữ hàng, thay giá hoặc gửi đơn tới điểm bán.
      </p>
      {contact && (
        <Modal title={`Trao đổi với ${contact.name}`} onClose={() => setContact(null)}>
          <form
            className="planning-contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveAgreement();
            }}
          >
            <div className="planning-summary">
              <Phone size={21} />
              <div>
                <strong>{contact.phone}</strong>
                <p>{contact.area} · Thông tin liên hệ minh họa</p>
              </div>
            </div>
            <p>
              {lot.name} · Lô {lot.id} · HSD {fullDate(lot.expiry)}
            </p>
            <div className="planning-form-row">
              <label>
                Số lượng ({lot.unit})
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  max={forecast.available}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>
              <label>
                Giá trao đổi (đ/{lot.unit})
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            <label>
              Ghi nhận trao đổi
              <textarea
                value={note}
                placeholder="Ví dụ: Điểm bán đồng ý nhận hàng vào buổi sáng"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="planning-explanation">
              Ghi nhận này chỉ nằm trong bản mô phỏng. Chưa áp dụng giá hoặc tạo đơn thật.
            </p>
            <div className="planning-dialog-actions">
              <button type="button" className="btn" onClick={() => setContact(null)}>
                Quay lại
              </button>
              <button className="btn primary" type="submit">
                Lưu kết quả trao đổi
              </button>
            </div>
          </form>
        </Modal>
      )}
      {draftDialog && agreement && buyer && (
        <Modal title="Kiểm tra đơn nháp minh họa" onClose={() => setDraftDialog(false)}>
          <div className="planning-body">
            <h3>{buyer.name}</h3>
            <p>
              {lot.name} · {lot.sku} · Lô {lot.id}
            </p>
            <p>
              {agreement.qty} {lot.unit} × {money(agreement.price)}/{lot.unit}
            </p>
            <div className="planning-trip-comparison">
              <span>Tạm tính</span>
              <strong>{money(agreement.qty * agreement.price)}</strong>
            </div>
            <p className="planning-explanation">
              Chưa trừ tồn hoặc gửi đơn. Khi triển khai thật, hệ thống cần kiểm tra lại giá, quyền
              và tồn theo lô.
            </p>
            <div className="planning-dialog-actions">
              <button className="btn" onClick={() => setDraftDialog(false)}>
                Quay lại
              </button>
              <button className="btn primary" onClick={createDraft}>
                Tạo bản nháp minh họa
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
