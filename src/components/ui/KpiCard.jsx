export default function KpiCard({ title, value, icon: Icon, color = 'red', trend }) {
  const colors = {
    red: 'bg-red-50 text-nfc-red dark:bg-red-900/20',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20',
  };

  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
