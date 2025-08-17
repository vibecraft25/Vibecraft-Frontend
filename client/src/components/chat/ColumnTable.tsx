import { Table, Checkbox } from "antd";
import { useState, useEffect } from "react";

interface ColumnTableProps {
  tableData: {
    title: string;
    columns: string[];
    rows: string[][];
  };
  selectedColumns?: string[];
  setSelectedColumns?: (columns: string[]) => void;
}

const ColumnTable = ({ tableData, selectedColumns = [], setSelectedColumns }: ColumnTableProps) => {
  // 컬럼 선택 핸들러
  const handleColumnSelect = (columnName: string, checked: boolean) => {
    if (!setSelectedColumns) return;
    
    if (checked) {
      setSelectedColumns([...selectedColumns, columnName]);
    } else {
      setSelectedColumns(selectedColumns.filter(col => col !== columnName));
    }
  };

  const columns = tableData.columns.map((col, index) => ({
    title: (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedColumns.includes(col)}
          onChange={(e) => handleColumnSelect(col, e.target.checked)}
        />
        <span>{col}</span>
      </div>
    ),
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
          pagination={false}
        />
      </div>
    </div>
  );
};

export default ColumnTable;
