import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import {
  api,
  command,
  record,
  records,
  textValue,
  numberValue,
  type RecordData,
} from '../../shared/api';
import { useApi } from '../../shared/hooks/useApi';
import { LoadState } from '../../shared/ApiUI';
import { useStore } from '../../shared/store';
import { Badge, SearchBox, Table } from '../../shared/ui';
import { today } from '../../shared/utils';
import { mondayOf, shiftDay, weekDays } from '../../shared/routeSchedule';
import { rows, personName, nppName, dateText } from './model';
import { salesAreas, organizationPathLabel } from '../../shared/distributionHierarchy';
type Entry = { storeId: number; sequence: number; weekdays: number[] };
export function RouteMcpEditor({
  route,
  network,
  onSaved,
}: {
  route: RecordData;
  network: RecordData;
  onSaved: () => void;
}) {
  const { has, notify } = useStore();
  const [start, setStart] = useState(mondayOf(today())),
    [entries, setEntries] = useState<Entry[]>([]),
    [rep, setRep] = useState(''),
    [organization, setOrganization] = useState(''),
    [effective, setEffective] = useState(today()),
    [query, setQuery] = useState(''),
    [addition, setAddition] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [history, setHistory] = useState(false),
    [version, setVersion] = useState(0);
  const result = useApi<RecordData>(
    `/routes/${route.id}/mcp?weekStart=${start}`,
    {},
    !dirty && !busy,
  );
  const data = result.data,
    days = weekDays(start),
    end = days[6],
    writable = has('ROUTE_WRITE') && end >= today();
  const stores = rows(network, 'stores').filter((store) => store.nppId === route.nppId);
  const visits = records(data.visits),
    holidays = Array.isArray(data.holidays) ? data.holidays.map(String) : [];
  const staff = rows(network, 'staff').filter(
    (person) => person.nppId === route.nppId && person.role === 'SALES',
  );
  const unassigned = stores.filter(
    (store) =>
      (!store.routeId || store.routeId === route.id) &&
      !entries.some((entry) => entry.storeId === store.id),
  );
  useEffect(() => {
    if (!data.weekStart || dirty) return;
    setEntries(
      records(data.entries).map((entry) => ({
        storeId: numberValue(entry.storeId),
        sequence: numberValue(entry.sequence),
        weekdays: Array.isArray(entry.weekdays) ? entry.weekdays.map(Number) : [],
      })),
    );
    setRep(textValue(data.repId));
    setVersion(numberValue(record(data.route).version));
    setOrganization(
      salesAreas(rows(network, 'organizations'), route.nppId).some(
        (unit) => textValue(unit.id) === textValue(record(data.route).organizationId),
      )
        ? textValue(record(data.route).organizationId)
        : '',
    );
    setEffective(end < today() ? end : start > today() ? start : today());
    setDirty(false);
    setError('');
  }, [data]);
  function changeWeek(next: string) {
    if (dirty && !window.confirm('Lịch chưa được lưu. Chuyển sang tuần khác?')) return;
    setDirty(false);
    setStart(mondayOf(next));
    setError('');
  }
  function toggle(storeId: number, weekday: number) {
    setEntries((old) =>
      old.map((entry) =>
        entry.storeId !== storeId
          ? entry
          : {
              ...entry,
              weekdays: entry.weekdays.includes(weekday)
                ? entry.weekdays.filter((day) => day !== weekday)
                : [...entry.weekdays, weekday].sort(),
            },
      ),
    );
    setDirty(true);
  }
  function move(index: number, delta: number) {
    const next = [...entries],
      target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setEntries(next.map((entry, i) => ({ ...entry, sequence: i + 1 })));
    setDirty(true);
  }
  async function copyPrevious() {
    setBusy(true);
    setError('');
    try {
      const previous = await api<RecordData>(
        `/routes/${route.id}/mcp?weekStart=${shiftDay(start, -7)}`,
      );
      const old = records(previous.entries);
      if (!old.some((entry) => Array.isArray(entry.weekdays) && entry.weekdays.length))
        throw Error('Tuần trước chưa có lịch để sao chép.');
      setEntries(
        entries.map((entry) => {
          const source = old.find((item) => item.storeId === entry.storeId);
          const locked = (weekday: number) =>
            days[weekday - 1] < effective ||
            holidays.includes(days[weekday - 1]) ||
            visits.some(
              (visit) =>
                visit.storeId === entry.storeId &&
                visit.day === days[weekday - 1] &&
                ['CHECKED_IN', 'COMPLETED'].includes(textValue(visit.status)),
            );
          const copied = Array.isArray(source?.weekdays) ? source.weekdays.map(Number) : [];
          return source
            ? {
                ...entry,
                weekdays: [
                  ...new Set([
                    ...entry.weekdays.filter(locked),
                    ...copied.filter((day) => !locked(day)),
                  ]),
                ].sort(),
              }
            : entry;
        }),
      );
      setDirty(true);
      notify('Đã sao chép lịch vào bản đang chỉnh sửa. Kiểm tra trước khi lưu.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      await command(`/routes/${route.id}/mcp`, {
        weekStart: start,
        effectiveFrom: effective,
        repId: Number(rep),
        organizationId: Number(organization) || null,
        version,
        entries: entries.map((entry, i) => ({ ...entry, sequence: i + 1 })),
      });
      setDirty(false);
      result.reload();
      onSaved();
      notify('Đã lưu lịch tuần và giao lượt ghé cho Sales.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mcp-editor">
      <div className="mcp-week-toolbar">
        <div className="mcp-week-picker">
          <button
            className="icon-button"
            aria-label="Tuần trước"
            onClick={() => changeWeek(shiftDay(start, -7))}
            disabled={busy}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            Tuần làm việc
            <input
              type="date"
              title="Chọn một ngày trong tuần cần phân công; lịch tự bắt đầu từ thứ Hai"
              value={start}
              onChange={(event) => event.target.value && changeWeek(event.target.value)}
            />
          </label>
          <button
            className="icon-button"
            aria-label="Tuần sau"
            onClick={() => changeWeek(shiftDay(start, 7))}
            disabled={busy}
          >
            <ChevronRight size={18} />
          </button>
          <span>
            {dateText(start)} – {dateText(end)}
          </span>
        </div>
        <div className="toolbar">
          <button
            className="btn"
            disabled={!writable || busy || result.loading}
            onClick={() => void copyPrevious()}
          >
            <Copy size={15} />
            Sao chép tuần trước
          </button>
          <button
            className="btn primary"
            disabled={!writable || busy || result.loading || !rep || !organization}
            onClick={() => void save()}
          >
            <Save size={16} />
            {busy ? 'Đang xử lý…' : 'Lưu & giao lịch tuần'}
          </button>
        </div>
      </div>
      <LoadState {...result} retry={result.reload} />
      {error && (
        <div className="info-box" role="alert">
          {error}
        </div>
      )}
      <div className="mcp-assignment-fields">
        <label>
          Nhà phân phối
          <input value={nppName(network, route.nppId)} readOnly />
        </label>
        <label>
          Sales thực hiện từ ngày hiệu lực
          <select
            value={rep}
            disabled={!writable || busy || result.loading}
            onChange={(event) => {
              setRep(event.target.value);
              setDirty(true);
            }}
          >
            <option value="">Chọn Sales</option>
            {staff.map((person) => (
              <option key={textValue(person.id)} value={textValue(person.id)}>
                {textValue(person.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngày hiệu lực
          <input
            type="date"
            value={effective}
            min={start > today() ? start : today()}
            max={end}
            disabled={!writable || busy || result.loading}
            onChange={(event) => {
              setEffective(event.target.value);
              setDirty(true);
            }}
          />
        </label>
        <label>
          Vùng bán hàng
          <select
            value={organization}
            disabled={!writable || busy || result.loading}
            onChange={(event) => {
              setOrganization(event.target.value);
              setDirty(true);
            }}
          >
            <option value="">Chọn vùng bán hàng thuộc NPP...</option>
            {salesAreas(rows(network, 'organizations'), route.nppId).map((unit) => (
              <option key={textValue(unit.id)} value={textValue(unit.id)}>
                {organizationPathLabel(rows(network, 'organizations'), unit.id)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mcp-help">
        MCP là lịch ghé điểm bán theo từng tuần. Chọn ngày ở các cột rồi lưu để giao lịch cho nhân
        viên. Lượt đã ghé được giữ nguyên người thực hiện; người đi thay nhận phần chưa ghé từ ngày
        hiệu lực.
      </p>
      <div className="tabs" aria-label="Nội dung tuyến">
        <button className={!history ? 'active' : ''} onClick={() => setHistory(false)}>
          Thiết lập MCP
        </button>
        <button className={history ? 'active' : ''} onClick={() => setHistory(true)}>
          Lịch sử ghé trong tuần
        </button>
      </div>
      {history ? (
        <Table
          rows={visits.filter((visit) =>
            ['CHECKED_IN', 'COMPLETED'].includes(textValue(visit.status)),
          )}
          columns={[
            { key: 'day', label: 'Ngày', render: (visit) => dateText(visit.day) },
            { key: 'storeName', label: 'Điểm bán', render: (visit) => textValue(visit.storeName) },
            {
              key: 'performedBy',
              label: 'Người thực hiện',
              render: (visit) => textValue(visit.performedBy) || personName(network, visit.repId),
            },
            {
              key: 'status',
              label: 'Trạng thái',
              render: (visit) => <Badge status={textValue(visit.status)} />,
            },
            {
              key: 'checkedInAt',
              label: 'Giờ vào',
              render: (visit) =>
                visit.checkedInAt
                  ? new Date(textValue(visit.checkedInAt)).toLocaleString('vi-VN')
                  : '—',
            },
            {
              key: 'checkedOutAt',
              label: 'Giờ ra',
              render: (visit) =>
                visit.checkedOutAt
                  ? new Date(textValue(visit.checkedOutAt)).toLocaleString('vi-VN')
                  : '—',
            },
          ]}
        />
      ) : (
        <>
          <div className="mcp-list-tools">
            <SearchBox value={query} onChange={setQuery} placeholder="Tìm điểm bán hoặc địa chỉ…" />
            <span>
              {entries.length} điểm bán · {dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}
            </span>
          </div>
          {writable && (
            <div className="mcp-add-store">
              <label>
                Thêm điểm bán vào tuyến
                <select value={addition} onChange={(event) => setAddition(event.target.value)}>
                  <option value="">Chọn điểm bán cùng NPP</option>
                  {unassigned.map((store) => (
                    <option key={textValue(store.id)} value={textValue(store.id)}>
                      {textValue(store.name)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn"
                disabled={!addition || busy || result.loading}
                onClick={() => {
                  setEntries([
                    ...entries,
                    { storeId: Number(addition), sequence: entries.length + 1, weekdays: [] },
                  ]);
                  setAddition('');
                  setDirty(true);
                }}
              >
                <Plus size={16} />
                Thêm điểm bán
              </button>
            </div>
          )}
          <div className="nsx-mcp-scroll">
            <table className="nsx-mcp mcp-edit-table">
              <thead>
                <tr>
                  <th>Thứ tự</th>
                  <th>Điểm bán / địa chỉ</th>
                  <th>Nhà phân phối</th>
                  <th>Tần suất tuần</th>
                  {days.map((day, index) => (
                    <th key={day}>
                      {index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}
                      <small>{dateText(day)}</small>
                    </th>
                  ))}
                  <th>Điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const store =
                    stores.find((item) => item.id === entry.storeId) ||
                    records(data.entries).find((item) => item.storeId === entry.storeId) ||
                    {};
                  if (
                    !`${store.name} ${store.address}`
                      .toLocaleLowerCase('vi')
                      .includes(query.toLocaleLowerCase('vi'))
                  )
                    return null;
                  const actual = visits.filter(
                    (visit) =>
                      visit.storeId === entry.storeId &&
                      ['CHECKED_IN', 'COMPLETED'].includes(textValue(visit.status)),
                  );
                  return (
                    <tr key={entry.storeId}>
                      <td>
                        <span>{index + 1}</span>
                        <div className="mcp-reorder">
                          <button
                            className="icon-button"
                            disabled={!writable || busy || result.loading || index === 0}
                            aria-label={`Đưa ${store.name} lên`}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={
                              !writable || busy || result.loading || index === entries.length - 1
                            }
                            aria-label={`Đưa ${store.name} xuống`}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link to={`/network?view=stores&id=${entry.storeId}`}>
                          {textValue(store.name)}
                        </Link>
                        <small>{textValue(store.address)}</small>
                      </td>
                      <td>{nppName(network, route.nppId)}</td>
                      <td>{entry.weekdays.length} lượt / tuần</td>
                      {days.map((day, i) => {
                        const visit = actual.find((item) => item.day === day),
                          locked = !!visit || day < effective || holidays.includes(day);
                        return (
                          <td key={day} className={visit ? 'mcp-cell-visited' : ''}>
                            <input
                              type="checkbox"
                              aria-label={`${store.name} · ${i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`} ${dateText(day)}`}
                              checked={entry.weekdays.includes(i + 1)}
                              disabled={!writable || busy || result.loading || locked}
                              onChange={() => toggle(entry.storeId, i + 1)}
                            />
                            {visit && (
                              <small>{visit.status === 'COMPLETED' ? 'Đã ghé' : 'Đang ghé'}</small>
                            )}
                            {holidays.includes(day) && <small>Ngày nghỉ</small>}
                          </td>
                        );
                      })}
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Xóa lịch tuần của ${store.name}`}
                          disabled={!writable || busy || result.loading || actual.length > 0}
                          onClick={() => {
                            setEntries(
                              entries.map((item) =>
                                item.storeId === entry.storeId
                                  ? {
                                      ...item,
                                      weekdays: item.weekdays.filter(
                                        (weekday) => days[weekday - 1] < effective,
                                      ),
                                    }
                                  : item,
                              ),
                            );
                            setDirty(true);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!entries.length && !result.loading && (
              <div className="empty">
                Chưa có điểm bán trong tuyến. Thêm điểm bán rồi chọn ngày ghé.
              </div>
            )}
          </div>
          <p className="mcp-help">
            Ô mờ là lượt đã phát sinh hoặc ngày trước ngày hiệu lực. Lưu lịch cập nhật lượt chưa
            ghé; dữ liệu ghé thực tế được giữ nguyên.
          </p>
        </>
      )}
    </div>
  );
}
