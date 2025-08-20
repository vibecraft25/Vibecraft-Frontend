import { ChatMessage, ComponentType } from "@/core";

import Menu, { MenuOption } from "./Menu";
import Uploader from "./Uploader";
// import ColumnTable from "./ColumnTable";
import DataTable from "./DataTable";
import Visualize from "./Visualize";
// import Visualize from "./Visualize";

interface ComponentRendererProps {
  message: ChatMessage;
  threadId: string | undefined;
  lastEndpoint: string | undefined;
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  onMenuOptionSelect: (option: MenuOption) => void;
}

const ComponentRenderer = ({
  message,
  threadId,
  lastEndpoint,
  onMenuOptionSelect,
  selectedColumns,
  setSelectedColumns,
}: ComponentRendererProps) => {
  const renderComponent = (
    componentType: ComponentType,
    componentData: any
  ) => {
    switch (componentType) {
      case "MENU":
        return Array.isArray(componentData) ? (
          <Menu
            menuList={componentData}
            onOptionSelect={onMenuOptionSelect}
            className="w-full"
          />
        ) : null;

      case "DATA_UPLOAD":
        return <Uploader />;

      case "DATA_TABLE":
        return (
          // <ColumnTable
          //   tableData={componentData}
          //   selectedColumns={selectedColumns}
          //   setSelectedColumns={setSelectedColumns}
          // />
          <DataTable
            tableData={componentData}
            threadId={threadId}
            lastEndpoint={lastEndpoint}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          />
        );

      case "DATA_VISUALIZE":
        return (
          <Visualize
            visualizeList={componentData}
            onOptionSelect={onMenuOptionSelect}
          />
        );

      // case "BUILD_RESULT":
      //   return (
      //     <div className="w-full p-4 bg-green-50 border border-green-200 rounded">
      //       <div className="text-green-800 font-medium mb-2">빌드 결과</div>
      //       <div className="text-green-600 text-sm">
      //         대시보드가 성공적으로 생성되었습니다.
      //       </div>
      //     </div>
      //   );

      // case "DEPLOY_STATUS":
      //   return (
      //     <div className="w-full p-4 bg-purple-50 border border-purple-200 rounded">
      //       <div className="text-purple-800 font-medium mb-2">배포 상태</div>
      //       <div className="text-purple-600 text-sm">
      //         배포가 진행 중입니다...
      //       </div>
      //     </div>
      //   );

      default:
        console.warn(`Unknown component type: ${componentType}`);
        return null;
    }
  };

  return (
    <div className="text-gray-800">
      {message.componentType &&
        renderComponent(message.componentType, message.componentData)}
    </div>
  );
};

export default ComponentRenderer;
