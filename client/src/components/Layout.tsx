import Sidebar, { SidebarProps } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarProps?: SidebarProps;
  className?: string;
}

const Layout = ({
  children,
  showSidebar = true,
  sidebarProps,
  className = "",
}: LayoutProps) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex ${className}`}>
      {/* Sidebar */}
      {showSidebar && sidebarProps && <Sidebar {...sidebarProps} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
