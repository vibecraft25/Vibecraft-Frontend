import React from "react";
import { Drawer, Button, Typography } from "antd";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Chattings, { ChattingsProps } from "./Chattings";
import { ChatSession } from "../types/session";

const { Title } = Typography;

export interface SidebarProps {
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
  chattingProps: ChattingsProps;
}

const Sidebar = ({
  className = "",
  isOpen,
  onToggle,
  chattingProps,
}: SidebarProps) => {
  return (
    <div
      className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
        isOpen ? "w-80" : "w-16"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {isOpen && (
          <Title level={4} className="mb-0 text-gray-800">
            VibeCraft
          </Title>
        )}
        <Button
          type="text"
          icon={
            isOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          }
          onClick={onToggle}
          className="flex items-center justify-center"
        />
      </div>

      {isOpen ? (
        <>
          {/* Chattings Component */}
          <div className="flex-1 overflow-hidden">
            <Chattings {...chattingProps} />
          </div>

          {/* Settings */}
          <div className="p-4 border-t border-gray-200">
            <Button
              type="text"
              icon={<Settings className="w-4 h-4" />}
              className="w-full justify-start text-gray-600 hover:text-gray-800"
            >
              설정
            </Button>
          </div>
        </>
      ) : (
        /* Collapsed State */
        <div className="flex flex-col items-center py-4 space-y-4">
          <Button
            type="text"
            icon={<Settings className="w-4 h-4" />}
            className="text-gray-600"
            title="설정"
          />
        </div>
      )}
    </div>
  );
};

export default Sidebar;
