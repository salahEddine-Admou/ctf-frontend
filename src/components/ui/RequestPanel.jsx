import { Check, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../utils/constants';

/** Pending requests list for admin approve/reject */
export function PendingRequestsPanel({ title, requests, onApprove, onReject, renderDetails }) {
  const pending = requests.filter((r) => r.status === 'pending');
  if (!pending.length) return null;

  return (
    <div className="card border-l-4 border-l-nfc-red">
      <h3 className="font-semibold mb-3">{title} ({pending.length})</h3>
      <div className="space-y-3">
        {pending.map((req) => (
          <div key={req._id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
            <div className="flex-1 min-w-0">
              {renderDetails(req)}
              <p className="text-xs text-gray-400 mt-1">{formatDate(req.createdAt)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => onApprove(req)} className="btn-primary text-xs flex items-center gap-1 py-2">
                <Check className="w-4 h-4" /> Approuver
              </button>
              <button type="button" onClick={() => onReject(req)} className="btn-secondary text-xs flex items-center gap-1 py-2">
                <X className="w-4 h-4" /> Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Client's own requests history */
export function MyRequestsList({ title, requests, renderLine }) {
  if (!requests?.length) return null;
  return (
    <div className="card">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {requests.map((req) => (
          <div key={req._id} className="flex justify-between items-center text-sm border-b py-2 gap-2">
            <div className="min-w-0">{renderLine(req)}</div>
            <StatusBadge status={req.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
