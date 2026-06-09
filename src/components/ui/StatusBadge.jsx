import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants';

export default function StatusBadge({ status, labels }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const text = labels?.[status] || STATUS_LABELS[status] || status?.replace(/_/g, ' ');
  return (
    <span className={`badge ${color}`}>
      {text}
    </span>
  );
}
