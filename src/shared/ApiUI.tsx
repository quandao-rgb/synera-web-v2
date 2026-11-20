import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { Modal, Table, Panel, SearchBox, PageHead } from './ui';
import { api, textValue, type RecordData } from './api';
import { useApi } from './hooks/useApi';
import { useStore } from './store';
import { inputExample } from './inputGuidance';
import { unitName } from './productMedia';
import { displayLabel } from './labels';

export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="info-box" role="alert">
        <AlertCircle size={18} /> {error}{' '}
        <button className="btn" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  return loading ? (
    <div className="loading" role="status">
      Đang tải dữ liệu...
    </div>
  ) : null;
}
export function DataList({
  title,
  description,
  path,
  columns,
  actions,
  onRow,
}: {
  title: string;
  description: string;
  path: string;
  columns: { key: string; label: string; render?: (row: RecordData) => ReactNode }[];
  actions?: ReactNode;
  onRow?: (row: RecordData) => void;
}) {
  const state = useApi<RecordData[]>(path, []);
  const [query, setQuery] = useState('');
  return (
    <>
      <PageHead title={title} description={description}>
        <button className="btn" onClick={state.reload}>
          <RefreshCw size={16} /> Làm mới
        </button>
        {actions}
      </PageHead>
      <LoadState {...state} retry={state.reload} />
      <Panel>
        <div className="table-toolbar">
          <SearchBox value={query} onChange={setQuery} />
        </div>
        <Table
          rows={state.data.filter((row) =>
            JSON.stringify(row).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
          )}
          searchText={query}
          columns={columns.map((c) => ({
            ...c,
            render:
              c.render ||
              ((row: RecordData) =>
                ['type', 'kind', 'role', 'scope', 'docType'].includes(c.key)
                  ? displayLabel(row[c.key])
                  : textValue(row[c.key])),
          }))}
          onRow={onRow}
        />
      </Panel>
    </>
  );
}
export interface FormField {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string | number;
  options?: { value: string | number; label: string }[];
  min?: number | string;
  max?: number | string;
  step?: string;
  hint?: string;
  placeholder?: string;
  selected?: string[];
  nppId?: number;
  advanced?: boolean;
}
export function ActionForm({
  title,
  fields: suppliedFields,
  onSubmit,
  onClose,
  intro,
  context,
  submitLabel = 'Lưu thay đổi',
  wide = false,
  presentation,
}: {
  title: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  onClose: () => void;
  intro?: ReactNode;
  context?: string;
  submitLabel?: string;
  wide?: boolean;
  presentation?: 'dialog' | 'sheet';
}) {
  const fields = suppliedFields.map((field) =>
    field.key === 'reason' || (field.key === 'note' && field.label.includes('Ghi chú'))
      ? { ...field, required: false }
      : field,
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries()) as Record<string, string>;
    for (const field of fields)
      if (field.type === 'multiselect')
        values[field.key] = form.getAll(field.key).map(String).join(',');
    setBusy(true);
    setError('');
    try {
      await onSubmit(values);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu dữ liệu.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const renderField = (field: FormField) => (
    <label
      key={field.key}
      className={
        ['textarea', 'lines', 'attachment'].includes(field.type || '') ? 'form-field-wide' : ''
      }
    >
      {field.label}
      {field.options ? (
        <select
          name={field.key}
          multiple={field.type === 'multiselect'}
          required={field.required !== false}
          defaultValue={field.type === 'multiselect' ? field.selected || [] : field.value}
          title={`Chọn ${field.label.toLocaleLowerCase('vi')}${field.type === 'multiselect' ? ' — có thể chọn nhiều mục' : ''}`}
        >
          {!field.options.length && <option value="">Chưa có lựa chọn phù hợp</option>}
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {displayLabel(option.label)}
            </option>
          ))}
        </select>
      ) : field.type === 'lines' ? (
        <LineEditor name={field.key} />
      ) : field.type === 'attachment' ? (
        <FileField field={field} />
      ) : field.type === 'textarea' ? (
        <textarea
          name={field.key}
          required={field.required !== false}
          defaultValue={field.value}
          placeholder={field.placeholder || inputExample(field)}
        />
      ) : (
        <input
          name={field.key}
          type={field.type || 'text'}
          required={field.required !== false}
          defaultValue={field.value}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder || inputExample(field)}
          title={field.hint || field.placeholder || inputExample(field)}
        />
      )}
      {field.hint && <small>{field.hint}</small>}
      {!field.hint &&
        !field.options &&
        ['date', 'datetime-local', 'time', 'month'].includes(field.type || '') && (
          <small className="input-example">{field.placeholder || inputExample(field)}</small>
        )}
    </label>
  );
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!submitting.current) onClose();
      }}
      wide={wide || fields.length > 3 || Boolean(intro)}
      variant={presentation || 'dialog'}
      className={`action-modal ${!wide && fields.length <= 3 && !intro ? 'compact-action-modal' : ''}`}
    >
      <form
        className={`stack action-form ${fields.length > 3 ? 'action-form-columns' : ''}`}
        onSubmit={submit}
      >
        {context && <div className="action-context">{context}</div>}
        {intro && <div className="form-field-wide">{intro}</div>}
        {fields.filter((field) => !field.advanced).map(renderField)}
        {fields.some((field) => field.advanced) && (
          <details className="form-field-wide form-advanced">
            <summary>Vị trí GPS</summary>
            <div className="form-advanced-fields">
              {fields.filter((field) => field.advanced).map(renderField)}
            </div>
          </details>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="action-form-footer form-field-wide">
          <button className="btn" type="button" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button
            className="btn primary"
            disabled={
              busy ||
              fields.some((field) => field.required !== false && field.options?.length === 0)
            }
          >
            {busy ? 'Đang lưu...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function FileField({ field }: { field: FormField }) {
  const [value, setValue] = useState(field.value || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError('');
          setValue('');
          try {
            if (!field.nppId) throw new Error('Chọn NPP trước khi tải tệp.');
            const form = new FormData();
            form.set('nppId', String(field.nppId));
            form.set('file', file);
            const result = await api<RecordData>('/attachments/upload', { body: form });
            setValue(textValue(result.id));
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được tệp.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <input
        name={field.key}
        aria-label="Mã tệp đã tải"
        value={value}
        readOnly
        required={field.required !== false}
        type="text"
        placeholder={busy ? 'Đang tải tệp...' : 'Chưa có tệp'}
      />
      {error && (
        <span role="alert" className="form-error">
          {error}
        </span>
      )}
    </>
  );
}
function LineEditor({ name }: { name: string }) {
  const [lines, setLines] = useState([{ skuId: '', uom: '', qty: 1 }]);
  return (
    <span className="stack">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(lines.map((l) => ({ ...l, skuId: Number(l.skuId) })))}
      />
      {lines.map((line, index) => (
        <span className="panel stack" key={index}>
          <LineRow
            line={line}
            onChange={(value) => setLines((old) => old.map((l, i) => (i === index ? value : l)))}
          />
          {lines.length > 1 && (
            <button
              type="button"
              className="btn"
              onClick={() => setLines((old) => old.filter((_, i) => i !== index))}
            >
              Bỏ dòng
            </button>
          )}
        </span>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => setLines((old) => [...old, { skuId: '', uom: '', qty: 1 }])}
      >
        Thêm sản phẩm
      </button>
    </span>
  );
}
function LineRow({
  line,
  onChange,
}: {
  line: { skuId: string; uom: string; qty: number };
  onChange: (line: { skuId: string; uom: string; qty: number }) => void;
}) {
  const { products } = useStore();
  const units = useApi<RecordData[]>(line.skuId ? `/catalog/skus/${line.skuId}/units` : null, []);
  return (
    <>
      <select
        aria-label="Sản phẩm dòng"
        required
        value={line.skuId}
        onChange={(e) => onChange({ ...line, skuId: e.target.value, uom: '' })}
      >
        <option value="">Chọn sản phẩm</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Đơn vị dòng"
        required
        value={line.uom}
        onChange={(e) => onChange({ ...line, uom: e.target.value })}
      >
        <option value="">Chọn đơn vị</option>
        {units.data.map((u) => (
          <option key={textValue(u.code)} value={textValue(u.code)}>
            {unitName(textValue(u.code))}
          </option>
        ))}
      </select>
      <input
        aria-label="Số lượng dòng"
        placeholder="VD: 12"
        type="number"
        required
        min="0.001"
        step="0.001"
        value={line.qty}
        onChange={(e) => onChange({ ...line, qty: Number(e.target.value) })}
      />
    </>
  );
}
export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="btn primary" onClick={onClick}>
      <Plus size={16} />
      {children}
    </button>
  );
}
