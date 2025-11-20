import { useState } from "react";
import { Button, Typography } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TestChannels, { TestChannelsProps } from "./TestChannels";

const { Title } = Typography;

export interface TestSidebarProps {
  channelsProps: TestChannelsProps;
}

const TestSidebar = ({ channelsProps }: TestSidebarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div
      className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out h-screen ${
        sidebarOpen ? "w-80" : "w-16"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {sidebarOpen && (
          <Title level={4} className="mb-0 text-gray-800">
            VibeCraft
          </Title>
        )}
        <Button
          type="text"
          icon={
            sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          }
          onClick={handleToggleSidebar}
          className="flex items-center justify-center"
        />
      </div>

      {sidebarOpen ? (
        <>
          {/* Channels Component */}
          <div className="flex-1 overflow-y-auto">
            <TestChannels {...channelsProps} />
          </div>
        </>
      ) : (
        /* Collapsed State */
        <div className="flex flex-col items-center py-4 space-y-4" />
      )}
    </div>
  );
};

export default TestSidebar;
