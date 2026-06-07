export default function DataTable({ columns, data, onRowClick, loading }) {
  if (loading) {
    return <div className="card text-center py-12 text-gray-500">Chargement...</div>;
  }
  if (!data?.length) {
    return <div className="card text-center py-12 text-gray-500">Aucune donnée</div>;
  }
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row) => (
              <tr
                key={row._id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
