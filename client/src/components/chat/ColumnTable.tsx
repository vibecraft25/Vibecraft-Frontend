import { TableData } from "@/hooks/useSSE";

interface ColumnTableProps {
  tableStringify: string;
}

const ColumnTable = ({ tableStringify }: ColumnTableProps) => {
  const tableObject: TableData = JSON.parse(tableStringify);

  return <></>;
};

export default ColumnTable;
