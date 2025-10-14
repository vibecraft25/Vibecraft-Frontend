import { Popover, Button, Typography, Modal, message, Divider } from "antd";
import { Trash2, AlertTriangle } from "lucide-react";
import { useChannelActions, useChannelState } from "../core/stores";

const { Text } = Typography;

export interface SettingsProps {
  children: React.ReactNode;
}

const Settings = ({ children }: SettingsProps) => {
  const { deleteChannel, deleteAllChannels } = useChannelActions();
  const { currentChannel, channels } = useChannelState();

  const handleDeleteChannel = () => {
    if (!currentChannel) {
      message.warning("삭제할 채널이 없습니다.");
      return;
    }

    Modal.confirm({
      title: "채널 삭제",
      content: `"${currentChannel.meta.channelName}" 채널을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      okText: "삭제",
      cancelText: "취소",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteChannel(currentChannel.meta.channelId);
          message.success("채널이 성공적으로 삭제되었습니다.");
        } catch (error) {
          console.error("Failed to delete channel:", error);
          message.error("채널 삭제에 실패했습니다.");
        }
      },
    });
  };

  const handleDeleteAllChannels = () => {
    if (channels.length === 0) {
      message.warning("삭제할 채널이 없습니다.");
      return;
    }

    Modal.confirm({
      title: "모든 채널 삭제",
      content: (
        <div>
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <Text strong className="text-red-600">
              경고
            </Text>
          </div>
          <Text>
            총 {channels.length}개의 모든 채널을 삭제하시겠습니까?
            <br />
            모든 채팅 기록과 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수
            없습니다.
          </Text>
        </div>
      ),
      okText: "모든 채널 삭제",
      cancelText: "취소",
      okType: "danger",
      width: 450,
      onOk: async () => {
        try {
          await deleteAllChannels();
          message.success("모든 채널이 성공적으로 삭제되었습니다.");
        } catch (error) {
          console.error("Failed to delete all channels:", error);
          message.error("채널 삭제에 실패했습니다.");
        }
      },
    });
  };

  const settingsContent = (
    <div className="w-64 p-2">
      {/* 채널 관리 */}
      <div className="mb-2">
        <div className="flex items-center mb-3">
          <Text strong className="text-gray-800">
            채널 관리
          </Text>
        </div>
        <Divider className="my-2" />
        <div className="space-y-2">
          <Button
            type="text"
            danger
            onClick={handleDeleteChannel}
            disabled={!currentChannel}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            icon={<Trash2 className="w-4 h-4" />}
          >
            현재 채널 삭제
          </Button>

          <Button
            type="text"
            danger
            onClick={handleDeleteAllChannels}
            disabled={channels.length === 0}
            className="w-full justify-start text-red-700 hover:text-red-800 hover:bg-red-50"
            icon={<AlertTriangle className="w-4 h-4" />}
          >
            모든 채널 삭제
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={settingsContent}
      title="설정"
      trigger="click"
      placement="rightTop"
      overlayClassName="settings-popover"
    >
      {children}
    </Popover>
  );
};

export default Settings;
