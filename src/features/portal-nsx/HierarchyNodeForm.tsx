import { useState } from 'react';
import { ActionForm, type FormField } from '../../shared/ApiUI';
import { textValue, type RecordData } from '../../shared/api';
import {
  childDistributionType,
  distributionLevels,
  organizationPathLabel,
  validDistributionNode,
} from '../../shared/distributionHierarchy';
import { organizationKinds, regionName } from './model';

export function HierarchyNodeForm({
  nodes,
  picked,
  onClose,
  onSubmit,
}: {
  nodes: RecordData[];
  picked: RecordData;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
}) {
  const editing = Boolean(picked.id),
    fixedType = textValue(picked.type);
  const expectedParent =
    distributionLevels[
      distributionLevels.indexOf(fixedType as (typeof distributionLevels)[number]) - 1
    ];
  const parents = nodes.filter(
    (node) =>
      validDistributionNode(nodes, node) &&
      (editing
        ? node.type === expectedParent
        : ['NPP', 'REGION', 'PROVINCE'].includes(textValue(node.type))),
  );
  const initial = parents.some((node) => textValue(node.id) === textValue(picked.parentId))
    ? textValue(picked.parentId)
    : '';
  const [parentId, setParentId] = useState(initial);
  const parent = parents.find((node) => textValue(node.id) === parentId);
  const type = editing ? fixedType : childDistributionType(parent?.type);
  const fields: FormField[] = [
    ...(!editing ? [{ key: 'code', label: 'Mã đơn vị', placeholder: 'VD: MP-HCM-PN' }] : []),
    ...(type !== 'REGION'
      ? [
          {
            key: 'name',
            label: `Tên ${organizationKinds[type]?.toLocaleLowerCase('vi') || 'đơn vị'}`,
            value: textValue(picked.name),
            placeholder:
              type === 'PROVINCE'
                ? 'VD: TP. Hồ Chí Minh'
                : type === 'SALES_REGION'
                  ? 'VD: Vùng Phú Nhuận 01'
                  : 'VD: Miền Nam',
          },
        ]
      : []),
    ...(type === 'REGION'
      ? [
          {
            key: 'region',
            label: 'Miền',
            value: ['NORTH', 'CENTRAL', 'SOUTH'].includes(
              textValue(picked.region || parent?.region),
            )
              ? textValue(picked.region || parent?.region)
              : 'SOUTH',
            options: ['NORTH', 'CENTRAL', 'SOUTH'].map((value) => ({
              value,
              label: regionName(value),
            })),
          },
        ]
      : []),
    { key: 'reason', label: 'Ghi chú', type: 'textarea' },
  ];
  return (
    <ActionForm
      title={editing ? 'Chỉnh sửa cấp quản lý' : 'Thêm cấp quản lý'}
      fields={fields}
      context={
        type
          ? `Cấp đang cấu hình: ${organizationKinds[type]}`
          : 'Chọn cấp trên để xác định cấp cần thêm'
      }
      intro={
        <div className="hierarchy-parent-picker">
          <label>
            Cấp trên
            <select
              aria-label="Cấp trên"
              value={parentId}
              required
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">Chọn NPP, miền hoặc tỉnh/TP...</option>
              {parents.map((node) => (
                <option key={textValue(node.id)} value={textValue(node.id)}>
                  {node.type === 'NSX'
                    ? textValue(node.name)
                    : organizationPathLabel(nodes, node.id)}{' '}
                  · {organizationKinds[textValue(node.type)]}
                </option>
              ))}
            </select>
          </label>
          {parent && (
            <p>
              {organizationPathLabel(nodes, parent.id) || textValue(parent.name)}
              {type !== 'REGION' && type !== 'NPP' ? ` · ${regionName(parent.region)}` : ''}
            </p>
          )}
          <p>
            Mỗi NPP có thể có nhiều miền. Mỗi miền có nhiều tỉnh/TP; mỗi tỉnh/TP có nhiều vùng bán
            hàng.
          </p>
        </div>
      }
      onClose={onClose}
      onSubmit={(values) =>
        onSubmit({
          ...values,
          name: type === 'REGION' ? regionName(values.region) : values.name,
          type,
          parentId,
          region:
            type === 'REGION'
              ? values.region
              : type === 'NPP'
                ? textValue(picked.region)
                : textValue(parent?.region),
        })
      }
    />
  );
}
