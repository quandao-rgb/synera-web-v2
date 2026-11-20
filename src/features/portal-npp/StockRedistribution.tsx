import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, FilePlus2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useApi } from '../../shared/hooks/useApi';
import { command, records, textValue, numberValue, type RecordData } from '../../shared/api';
import { LoadState } from '../../shared/ApiUI';
import { Modal, Panel, Table, Empty } from '../../shared/ui';
import { money, today } from '../../shared/utils';
import { productImage, unitName } from '../../shared/productMedia';

const quantity = (n: unknown) =>
  numberValue(n).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const dateLabel = (value: unknown) =>
  textValue(value)
    ? new Date(textValue(value).slice(0, 10) + 'T12:00:00').toLocaleDateString('vi-VN')
    : '—';
export default function StockRedistribution({ warehouseId }: { warehouseId: string }) {
  const data = useApi<RecordData>(
    warehouseId ? `/inventory/redistribution?warehouseId=${warehouseId}` : null,
    {},
  );
  const [selected, setSelected] = useState(''),
    [buyerId, setBuyer] = useState('');
  const [riskOnly, setRiskOnly] = useState(true),
    [allBuyers, setAllBuyers] = useState(false);
  const [dialog, setDialog] = useState(false),
    [qty, setQty] = useState('1'),
    [uom, setUom] = useState(''),
    [note, setNote] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [interaction, setInteraction] = useState('');
  const [quote, setQuote] = useState<RecordData | null>(null),
    [order, setOrder] = useState('');
  const allLots = records(data.data.lots),
    risks = allLots.filter((l) => numberValue(l.surplus) > 0);
  const lots = riskOnly ? risks : allLots;
  const lot =
    lots.find((l) => textValue(l.id) === selected) ||
    lots.find((l) => records(l.buyers).length > 0 && !l.expired) ||
    lots[0];
  const buyers = records(lot?.buyers),
    buyer = buyers.find((b) => textValue(b.id) === buyerId) || buyers[0];
  const offers = useApi<RecordData[]>(
    buyer && !lot?.expired ? `/catalog/offerings?nppId=${buyer.nppId}&storeId=${buyer.id}` : null,
    [],
  );
  const choices = offers.data.filter((o) => o.skuId === lot?.skuId);
  const offer =
    choices.find((o) => o.uom === uom) || choices.find((o) => o.uom === lot?.unit) || choices[0];
  function resetDraft() {
    setInteraction('');
    setQuote(null);
    setOrder('');
    setError('');
    setUom('');
    setQty('1');
    setNote('');
  }
  function changeLot(id: string) {
    setSelected(id);
    setBuyer('');
    setAllBuyers(false);
    resetDraft();
  }
  async function saveContact() {
    if (!buyer || !lot || busy || !note.trim()) return;
    setBusy(true);
    setError('');
    try {
      const r = await command('/interactions', {
        storeId: buyer.id,
        kind: 'CALL',
        note: `Phân phối hàng tồn: ${lot.name}, lô ${lot.lotNo}, HSD ${lot.expiryDate}. ${note.trim()}`,
      });
      setInteraction(textValue(r.id) || 'saved');
      setDialog(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được trao đổi.');
    } finally {
      setBusy(false);
    }
  }
  async function createQuote() {
    if (!buyer || !lot || !offer || busy || lot.expired || data.error || offers.error) return;
    setBusy(true);
    setError('');
    try {
      if (
        !Number.isFinite(Number(qty)) ||
        Number(qty) <= 0 ||
        Number(qty) * numberValue(offer.factor) > numberValue(lot.available)
      )
        throw Error('Số lượng vượt tồn khả dụng hoặc không hợp lệ.');
      const r = await command('/quotations', {
        storeId: buyer.id,
        validUntil: today(),
        lines: [{ skuId: lot.skuId, uom: offer.uom, qty: Number(qty) }],
      });
      setQuote(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lập được nháp.');
    } finally {
      setBusy(false);
    }
  }
  async function accept() {
    if (!quote || busy) return;
    setBusy(true);
    setError('');
    try {
      if (quote.status === 'DRAFT') {
        const sent = await command(`/quotations/${quote.id}/transition`, {
          status: 'SENT',
          reason: `Đã trao đổi báo giá với điểm bán, tham chiếu lô ${lot?.lotNo}.`,
        });
        setQuote(sent);
      }
      const r = await command(`/quotations/${quote.id}/transition`, {
        status: 'ACCEPTED',
        reason: `Điểm bán xác nhận nhu cầu, tham chiếu lô ${lot?.lotNo}.`,
      });
      setOrder(textValue(r.sales_order_id));
      setQuote(r);
      data.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa tạo được đơn.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="npp-planning-preview">
      <LoadState {...data} retry={data.reload} />
      {!warehouseId ? (
        <Empty text="Chọn kho để xem rủi ro tồn." />
      ) : !data.loading && !data.error && !allLots.length ? (
        <Empty text="Không có lô hàng còn tồn và có hạn sử dụng trong kho." />
      ) : (
        <>
          <div className="planning-columns stock-planning-columns">
            <Panel
              className="planning-panel planning-risk-list"
              title="Dự báo tồn theo lô"
              subtitle="Tốc độ bán trung bình trong 30 ngày gần nhất"
              action={<span className="planning-chip warning">{risks.length} lô có rủi ro</span>}
            >
              <div className="table-toolbar">
                <label className="planning-filter">
                  <input
                    type="checkbox"
                    checked={riskOnly}
                    disabled={busy}
                    onChange={(e) => {
                      setRiskOnly(e.target.checked);
                      changeLot('');
                    }}
                  />{' '}
                  Chỉ xem lô có nguy cơ ({risks.length}/{allLots.length})
                </label>
              </div>
              <Table
                rows={lots}
                pageSize={3}
                columns={[
                  {
                    key: 'product',
                    label: 'Sản phẩm / Lô',
                    render: (l) => (
                      <button
                        className="planning-lot-choice"
                        aria-pressed={l.id === lot?.id}
                        disabled={busy}
                        onClick={() => changeLot(textValue(l.id))}
                      >
                        <img src={productImage(textValue(l.name))} alt="" />
                        <span>
                          <strong>{textValue(l.name)}</strong>
                          <small>
                            {textValue(l.code)} · Lô {textValue(l.lotNo)}
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
                        <strong>{dateLabel(l.expiryDate)}</strong>
                        <small className={l.expired ? 'planning-warning-text' : ''}>
                          {l.expired ? 'Đã hết hạn' : `Còn ${quantity(l.days)} ngày`}
                        </small>
                      </span>
                    ),
                  },
                  {
                    key: 'available',
                    label: 'Tồn khả dụng',
                    render: (l) => (
                      <strong>
                        {quantity(l.available)} {unitName(textValue(l.unit))}
                      </strong>
                    ),
                  },
                  {
                    key: 'daily',
                    label: 'Bán TB/ngày',
                    render: (l) => `${quantity(l.daily)} ${unitName(textValue(l.unit))}`,
                  },
                  {
                    key: 'risk',
                    label: 'Dư tại HSD',
                    render: (l) => (
                      <strong className={numberValue(l.surplus) > 0 ? 'planning-warning-text' : ''}>
                        {quantity(l.surplus)} {unitName(textValue(l.unit))}
                      </strong>
                    ),
                  },
                ]}
              />
              {lot ? (
                <div className="planning-forecast">
                  <h3>
                    Dự báo lô {textValue(lot.lotNo)} trong {quantity(lot.days)} ngày
                  </h3>
                  <p>
                    Với nhịp bán {quantity(lot.daily)} {unitName(textValue(lot.unit))}/ngày, đến{' '}
                    {dateLabel(lot.expiryDate)} dự kiến còn {quantity(lot.surplus)}{' '}
                    {unitName(textValue(lot.unit))}.
                  </p>
                  <div className="planning-stock-total">
                    <span>Tồn khả dụng hiện tại</span>
                    <strong>
                      {quantity(lot.available)} {unitName(textValue(lot.unit))}
                    </strong>
                  </div>
                  <div className="planning-forecast-bar">
                    <span
                      style={{
                        width: `${numberValue(lot.available) ? (numberValue(lot.expectedSold) / numberValue(lot.available)) * 100 : 0}%`,
                      }}
                    />
                    <span style={{ flex: 1 }} />
                  </div>
                  <div className="planning-forecast-legend">
                    <span>
                      <i />
                      Dự kiến bán {quantity(lot.expectedSold)} {unitName(textValue(lot.unit))}
                    </span>
                    <span>
                      <i />
                      Dự kiến còn {quantity(lot.surplus)} {unitName(textValue(lot.unit))}
                    </span>
                  </div>
                  <div className="planning-forecast-date">
                    <CalendarDays size={17} /> Ngày dự báo {dateLabel(data.data.asOf)}
                  </div>
                  <p className="planning-method">
                    Dự báo theo lượng thực nhận, phân bổ sức bán cho lô hết hạn trước trên toàn NPP.
                    Nếu chưa có lịch sử bán, tốc độ tạm tính bằng 0.
                  </p>
                </div>
              ) : (
                !data.loading && (
                  <p className="planning-body">
                    Chưa có lô được dự báo dư tại hạn dùng. Bỏ chọn bộ lọc để xem toàn bộ lô.
                  </p>
                )
              )}
            </Panel>
            <Panel
              className="planning-panel"
              title="Điểm bán đề xuất"
              action={<span className="planning-chip">{buyers.length} điểm bán</span>}
            >
              <div className="planning-body">
                {lot && (
                  <div className="planning-summary">
                    <div>
                      <strong>
                        Đã từng mua {textValue(lot.name)} · {textValue(lot.code)}
                      </strong>
                      <p>Xếp theo lượng mua 30 ngày và lần mua gần nhất.</p>
                    </div>
                  </div>
                )}
                {buyers.length ? (
                  (allBuyers ? buyers : buyers.slice(0, 3)).map((b) => (
                    <div
                      className={`planning-buyer ${b.id === buyer?.id ? 'selected' : ''}`}
                      key={textValue(b.id)}
                    >
                      <div>
                        <h3>{textValue(b.name)}</h3>
                        <p>
                          Mua gần nhất {dateLabel(b.lastPurchase)} · {quantity(b.qtyBase30)}{' '}
                          {unitName(textValue(lot?.unit))} trong 30 ngày
                        </p>
                        <p>{textValue(b.address)}</p>
                        <span className="planning-phone">
                          {textValue(b.phone) || 'Chưa có số điện thoại'}
                        </span>
                      </div>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => {
                          setBuyer(textValue(b.id));
                          resetDraft();
                          setDialog(true);
                        }}
                      >
                        <Phone size={17} /> Liên hệ
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    text={
                      lot?.expired
                        ? 'Lô đã hết hạn: không đề xuất bán. Xử lý theo quy trình kho.'
                        : lot
                          ? 'Chưa có điểm bán từng nhận sản phẩm này. Chọn lô khác để xem đề xuất phù hợp.'
                          : 'Chọn lô để xem điểm bán phù hợp.'
                    }
                  />
                )}
                {buyers.length > 3 && (
                  <button className="planning-text-button" onClick={() => setAllBuyers(!allBuyers)}>
                    {allBuyers ? 'Thu gọn' : `Xem tất cả ${buyers.length} điểm bán`}
                  </button>
                )}
                {buyer && lot && !lot.expired && (
                  <>
                    {interaction && (
                      <div className="planning-alert success">
                        <CheckCircle2 size={20} />
                        <div>
                          <strong>Đã trao đổi với {textValue(buyer.name)}</strong>
                          <p>Nội dung đã lưu trong hồ sơ điểm bán.</p>
                        </div>
                      </div>
                    )}
                    <LoadState {...offers} retry={offers.reload} />
                    {!offers.loading && !offers.error && !choices.length && (
                      <p className="planning-alert warning">
                        Chưa có bảng giá hiệu lực cho sản phẩm và điểm bán này. Cập nhật bảng giá
                        trước khi lập nháp.
                      </p>
                    )}
                    <div className="planning-form-row">
                      <label>
                        Quy cách
                        <select
                          disabled={!!quote || busy || !offer}
                          value={textValue(offer?.uom)}
                          onChange={(e) => setUom(e.target.value)}
                        >
                          {choices.map((o) => (
                            <option key={textValue(o.uom)} value={textValue(o.uom)}>
                              {unitName(textValue(o.uom))} · {money(numberValue(o.price))}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Số lượng
                        <input
                          disabled={!!quote || busy}
                          type="number"
                          min={numberValue(offer?.multiple) || 1}
                          step={numberValue(offer?.multiple) || 1}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                        />
                      </label>
                    </div>
                    <p className="planning-explanation">
                      {!interaction && 'Liên hệ và lưu nội dung trao đổi trước khi lập nháp. '}Giá
                      lấy từ bảng giá đang hiệu lực; giá thương lượng khác cần cập nhật chính sách
                      giá. Khi xác nhận, hệ thống xuất lô theo hạn dùng, chưa giữ riêng lô đang xem.
                    </p>
                    {order ? (
                      <Link
                        className="btn primary planning-full"
                        to={`/orders?channel=sales&order=${order}`}
                      >
                        Xem đơn #{order}
                      </Link>
                    ) : quote ? (
                      <>
                        <p role="status">
                          Đã lưu báo giá nháp #{textValue(quote.id)} ·{' '}
                          {money(numberValue(quote.total))}
                        </p>
                        <Link to="/engagement">Xem báo giá đã lưu</Link>
                        <button
                          className="btn primary planning-full"
                          disabled={busy || quote.status === 'ACCEPTED'}
                          onClick={() => void accept()}
                        >
                          Khách đồng ý — xác nhận & lên đơn
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn primary planning-full"
                        disabled={
                          !interaction ||
                          !offer ||
                          busy ||
                          offers.loading ||
                          !!offers.error ||
                          !!data.error
                        }
                        onClick={() => void createQuote()}
                      >
                        <FilePlus2 size={17} />
                        {busy ? 'Đang lưu…' : 'Lập đơn nháp'}
                      </button>
                    )}
                  </>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
      {dialog && buyer && (
        <Modal
          title={`Ghi nhận trao đổi — ${textValue(buyer.name)}`}
          onClose={() => {
            if (!busy) setDialog(false);
          }}
        >
          <div className="planning-body">
            <p>
              {textValue(buyer.phone)} · {textValue(buyer.address)}
            </p>
            {Boolean(buyer.phone) && (
              <a className="btn" href={`tel:${textValue(buyer.phone)}`}>
                <Phone size={17} /> Gọi điểm bán
              </a>
            )}
            <label>
              Nội dung trao đổi
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi nhu cầu, lượng hàng, giá đã trao đổi và ngày có thể nhận…"
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="btn primary"
              disabled={!note.trim() || busy}
              onClick={() => void saveContact()}
            >
              {busy ? 'Đang lưu…' : 'Lưu vào hồ sơ điểm bán'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
