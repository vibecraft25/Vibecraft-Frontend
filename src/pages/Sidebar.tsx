import { useState } from "react";
import { Button, Typography } from "antd";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Channels, { ChannelsProps } from "./Channels";
import SettingsPopover from "../components/Settings";

const { Title } = Typography;

export interface SidebarProps {
  className?: string;
  channelsProps: ChannelsProps;
}

const Sidebar = ({ className = "", channelsProps }: SidebarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Event Handlers
  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div
      className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out h-screen ${
        sidebarOpen ? "w-80" : "w-16"
      } ${className}`}
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
          {/* Chattings Component */}
          <div className="flex-1 overflow-y-auto">
            <Channels {...channelsProps} />
          </div>

          {/* Settings */}
          <div className="p-4 border-t border-gray-200">
            <SettingsPopover>
              <Button
                type="text"
                icon={<Settings className="w-4 h-4" />}
                className="w-full justify-start text-gray-600 hover:text-gray-800"
              >
                설정
              </Button>
            </SettingsPopover>
          </div>
        </>
      ) : (
        /* Collapsed State */
        <div className="flex flex-col items-center py-4 space-y-4">
          <SettingsPopover>
            <Button
              type="text"
              icon={<Settings className="w-4 h-4" />}
              className="text-gray-600"
              title="설정"
            />
          </SettingsPopover>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
