import { useState } from 'react';
import { ActionForm } from '../../shared/ApiUI';
import { command, textValue, numberValue, type RecordData } from '../../shared/api';
import { organizationPathLabel, salesAreas } from '../../shared/distributionHierarchy';
import { useStore } from '../../shared/store';

export function RoutePlacement({
  route,
  nodes,
  onSaved,
}: {
  route: RecordData;
  nodes: RecordData[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false),
    { has, notify } = useStore();
  if (!has('ROUTE_WRITE')) return null;
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        Phân vùng tuyến
      </button>
      {open && (
        <ActionForm
          title="Phân vùng tuyến"
          context={textValue(route.name)}
          fields={[
            {
              key: 'organizationId',
              label: 'Vùng bán hàng',
              value: '',
              options: [
                { value: '', label: 'Chọn vùng bán hàng...' },
                ...salesAreas(nodes, route.nppId).map((node) => ({
                  value: textValue(node.id),
                  label: organizationPathLabel(nodes, node.id),
                })),
              ],
            },
            { key: 'reason', label: 'Lý do', type: 'textarea' },
          ]}
          onClose={() => setOpen(false)}
          onSubmit={async (values) => {
            await command(`/routes/${route.id}/organization`, {
              organizationId: Number(values.organizationId),
              version: numberValue(route.version),
              reason: values.reason,
            });
            onSaved();
            notify('Đã phân vùng tuyến; lịch ghé và người phụ trách được giữ nguyên.');
          }}
        />
      )}
    </>
  );
}
