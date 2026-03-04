import styled from 'styled-components';

const Wrap = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.panel};
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(22, 48, 71, 0.05);
`;

function DataTable({ title, columns, rows }) {
  return (
    <Wrap>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">实时数据</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-t border-slate-100 text-slate-700">
                {row.map((cell) => (
                  <td key={`${cell}-${index}`} className="px-5 py-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Wrap>
  );
}

export default DataTable;
