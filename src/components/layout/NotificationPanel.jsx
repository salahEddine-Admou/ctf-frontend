import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications } from '../../store/slices/notificationSlice';
import api from '../../api/axios';
import { formatDate } from '../../utils/constants';

export default function NotificationPanel({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    if (open) dispatch(fetchNotifications());
  }, [open, dispatch]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    dispatch(fetchNotifications());
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`, { ids: [id] });
    dispatch(fetchNotifications());
  };

  if (!open) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <span className="font-semibold">Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
        <button onClick={markAllRead} className="text-xs text-nfc-red hover:underline">Tout marquer lu</button>
      </div>
      <div className="overflow-y-auto flex-1">
        {items?.length ? items.map((n) => (
          <button
            key={n._id}
            onClick={() => { markRead(n._id); if (n.link) navigate(n.link); onClose(); }}
            className={`w-full text-left p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!n.isRead ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
          >
            <p className="font-medium text-sm">{n.title}</p>
            <p className="text-xs text-gray-500 mt-1">{n.message}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
          </button>
        )) : (
          <p className="p-6 text-center text-gray-500 text-sm">Aucune notification</p>
        )}
      </div>
      <button onClick={onClose} className="p-3 text-sm text-center border-t dark:border-gray-700 text-gray-500">Fermer</button>
    </div>
  );
}
