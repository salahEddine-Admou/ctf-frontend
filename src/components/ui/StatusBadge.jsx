import { STATUS_COLORS } from '../../utils/constants';

export default function StatusBadge({ status, labels }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const text = labels?.[status] || status?.replace(/_/g, ' ');
  return (
    <span className={`badge ${color}`}>
      {text}
    </span>
  );
}
