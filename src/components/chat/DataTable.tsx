import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Table, Checkbox, Button, Typography, message } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
import { getApiResponse } from "@/utils/apiEndpoints";
import { useChatActions } from "@/core";

const { Text } = Typography;

interface DataTableProps {
  tableData: string[];
  threadId: string | undefined;
  lastEndpoint: string | undefined;
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
}

interface TableFlag {
  __type: string;
  id: string;
  selected: string;
}

interface ColumnMapping {
  created_at: string;
  column_mapping: Record<string, string>;
}

interface TableRowData {
  key: string;
  [key: string]: any;
  _selected?: boolean;
}

const DataTable = ({
  tableData,
  threadId,
  lastEndpoint,
  selectedColumns,
  setSelectedColumns,
}: DataTableProps) => {
  const { getNextMessage, getMessageIndex, getMessageByIndex, updateMessage } =
    useChatActions();
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<ColumnsType<TableRowData>>([]);
  const [tableRows, setTableRows] = useState<TableRowData[]>([]);

  // api endpoint 활용하여 검사하는 flag
  const renderRef = useRef<boolean>(false);

  // 컬럼 선택 핸들러
  const handleColumnSelect = (columnName: string, checked: boolean) => {
    if (!setSelectedColumns) return;

    if (checked) {
      setSelectedColumns([...selectedColumns, columnName]);
    } else {
      setSelectedColumns(selectedColumns.filter((col) => col !== columnName));
    }
  };

  // 1. 첫번째 행 테이블 정보 파싱
  const parsedTableInfo = useMemo((): TableFlag | null => {
    if (!tableData || tableData.length === 0) return null;

    try {
      const firstRow = tableData[0];
      const parsed = JSON.parse(firstRow);
      if (parsed?.__type === "DATA_TABLE-FLAG") {
        return parsed as TableFlag;
      }
    } catch (error) {
      console.error("Failed to parse table flag:", error);
    }
    return null;
  }, [tableData]);

  // 2. API로 컬럼 정보 가져오기
  const fetchColumnMapping = useCallback(async () => {
    if (threadId) {
      try {
        setLoading(true);
        const response = await getApiResponse(
          { path: "/contents/meta", method: "GET" },
          { thread_id: threadId }
        );
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch column mapping:", error);
        message.error("컬럼 정보를 가져오는데 실패했습니다.");
        return null;
      } finally {
        setLoading(false);
      }
    }
  }, [threadId]);

  // 3. 테이블 컬럼 생성
  const createTableColumns = (
    columnMapping: Record<string, string>,
    recommad: string[] = []
  ): ColumnsType<TableRowData> => {
    if (!tableData || tableData.length < 4) return [];

    return Object.entries(columnMapping).map(
      ([key, value]: [string, string], idx: number) => {
        return {
          title: (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={recommad.includes(value)}
                onChange={(e) => handleColumnSelect(value, e.target.checked)}
              />
              <span>{key}</span>
            </div>
          ),
          dataIndex: idx,
          key: value,
          // render: (text: any) => String(text || ""),
        };
      }
    );
  };

  // 4. 테이블 데이터 파싱 (4번째 줄부터)
  const parseTableData = (
    tableColumns: ColumnsType<TableRowData>
  ): TableRowData[] => {
    if (!tableData || tableData.length < 4) return [];

    // 데이터는 4번째 줄부터 (인덱스 3부터)
    const dataRows = tableData.slice(3);

    return dataRows.map((row, index) => {
      const values = row.split(/\s{2,}/).filter((v) => v.trim());
      const rowData: TableRowData = {
        key: `row-${index}`,
      };

      tableColumns.forEach((column: ColumnType<TableRowData>, columnIndex) => {
        if (typeof column.dataIndex === "number") {
          rowData[column.dataIndex] = values[column.dataIndex] || "";
        }
      });

      return rowData;
    });
  };

  const updateMessageTableInfos = useCallback(() => {
    if (parsedTableInfo && parsedTableInfo.selected === "") {
      debugger;
      updateMessage(parsedTableInfo.id, {
        componentData: [
          JSON.stringify({
            ...parsedTableInfo,
            selected: JSON.stringify({
              columns: columns,
              rows: tableRows,
            }),
          }),
        ],
      });
    }
  }, [parsedTableInfo, columns, tableRows]);

  // 초기화 및 데이터 로드
  useEffect(() => {
    const initializeTable = async () => {
      if (!parsedTableInfo) {
        setLoading(true);
        return;
      }
      if (parsedTableInfo.selected && parsedTableInfo.selected !== "") {
        const { columns, rows } = JSON.parse(parsedTableInfo.selected);

        setColumns(columns);
        setTableRows(rows);
        renderRef.current = true;
        return;
      }
      if (renderRef.current === false) {
        setLoading(true);
        return;
      }

      // 컬럼 매핑 정보 가져오기
      const columnMapping = await fetchColumnMapping();
      if (!columnMapping) return;

      let recommad: string[] = [];
      // 다음 메시지에서 기본 선택값 설정
      const nextMessage = getNextMessage(parsedTableInfo.id);
      if (nextMessage && nextMessage.content) {
        recommad = nextMessage.content.split("\n")[0].trim().split(",");
        if (recommad) {
          debugger;
          setSelectedColumns([...recommad]);
        }
      }

      // 컬럼 생성
      const tableColumns = createTableColumns(
        columnMapping.column_mapping,
        recommad
      );
      setColumns(tableColumns);

      // 테이블 데이터 파싱
      const parsedRows = parseTableData(tableColumns);
      setTableRows(parsedRows);
    };

    initializeTable();
  }, [renderRef.current]);

  useEffect(() => {
    // 한번이라도 /workflow/stream/set-data sse 종료 시 ref true
    if (lastEndpoint === "/workflow/stream/set-data") {
      renderRef.current = true;
    }
    // 다음 스텝으로 이동 시, table 정보 저장
    else if (
      lastEndpoint === "/workflow/stream/process-data-selection" ||
      lastEndpoint === "/workflow/visualization-type"
    ) {
      updateMessageTableInfos();
    }
  }, [lastEndpoint]);

  if (!parsedTableInfo) {
    return (
      <div className="p-4">
        <Text type="danger">잘못된 테이블 데이터 형식입니다.</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <Text>컬럼 정보를 로딩 중...</Text>
      </div>
    );
  }

  return (
    <div className="p-4">
      {tableData.length > 1 && (
        <div className="mb-4">
          <Text strong className="text-gray-800">
            {tableData[1]}
          </Text>
        </div>
      )}

      <div className="mb-4">
        <Table
          columns={columns}
          dataSource={tableRows}
          pagination={false}
          scroll={{ x: true }}
          size="small"
          bordered
          className="data-table"
        />
      </div>
    </div>
  );
};

export default DataTable;
