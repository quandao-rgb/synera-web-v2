import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export function WorkLane({
  title,
  count,
  icon: Icon,
  tone = 'sales',
  selected = false,
  to,
  onClick,
}: {
  title: string;
  count: number | string;
  icon: LucideIcon;
  tone?: string;
  selected?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon size={21} />
      <span>
        {title}
        <strong>{typeof count === 'number' ? count.toLocaleString('vi-VN') : count}</strong>
      </span>
      <ArrowRight size={17} />
    </>
  );
  const className = `work-lane tone-${tone} ${selected ? 'selected' : ''}`;
  return to ? (
    <Link className={className} to={to}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} aria-pressed={selected} onClick={onClick}>
      {content}
    </button>
  );
}
