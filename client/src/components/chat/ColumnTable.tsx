import { Table } from "antd";

interface ColumnTableProps {
  tableData: {
    title: string;
    columns: string[];
    rows: string[][];
  };
}

const ColumnTable = ({ tableData }: ColumnTableProps) => {
  const columns = tableData.columns.map((col, index) => ({
    title: col,
    dataIndex: col,
    key: col,
    render: (text: any) => String(text || ""),
  }));

  const dataSource = tableData.rows.map((row, index) => {
    const rowData: any = { key: index };
    tableData.columns.forEach((col, colIndex) => {
      rowData[col] = row[colIndex];
    });
    return rowData;
  });

  return (
    <div className="space-y-4">
      <div className="text-gray-800">
        <p className="mb-3">
          <strong>{tableData.title}</strong>
        </p>
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: true }}
          size="small"
        />
      </div>
    </div>
  );
};

export default ColumnTable;
