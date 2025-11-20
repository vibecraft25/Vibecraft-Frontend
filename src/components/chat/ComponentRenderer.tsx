import { ChatMessage, ComponentType } from "@/core";
import { useArtifactActions } from "@/core/stores/artifactStore";

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
  const { showArtifact } = useArtifactActions();

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

      case "ARTIFACT":
        return (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-sm text-blue-700 font-medium">
                {componentData?.title || "Preview System"}가 준비되었습니다
              </p>
              <button
                onClick={() => {
                  showArtifact(
                    componentData?.url,
                    message.id,
                    componentData?.title,
                    componentData?.description
                  );
                }}
                className="ml-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                보기
              </button>
            </div>
          </div>
        );

      /*
      case "DATA_TABLE":
        return (
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
       */

      default:
        console.warn(`⚠️ Unknown component type: ${componentType}`);
        return undefined;
    }
  };

  const component =
    message.componentType &&
    renderComponent(message.componentType, message.componentData);

  return (
    component && (
      <div className="text-gray-800">
        {component}
      </div>
    )
  );
};

export default ComponentRenderer;
