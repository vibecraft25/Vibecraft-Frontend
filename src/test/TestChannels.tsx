import { Button, Typography, Tooltip } from "antd";
import { MessageSquare, Plus, Calendar, Trash2 } from "lucide-react";
import { TestChannel } from "./useTestChannel";

const { Text } = Typography;

export interface TestChannelsProps {
  channels: TestChannel[];
  currentChannelId: string | null;
  createChannel: (name: string, description: string) => Promise<string>;
  switchChannel: (channelId: string) => Promise<boolean>;
  deleteChannel: (channelId: string) => Promise<boolean>;
}

const TestChannels = ({
  channels,
  currentChannelId,
  createChannel,
  switchChannel,
  deleteChannel,
}: TestChannelsProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "방금";

    try {
      const date = new Date(dateString);
      const now = new Date();

      // 자정을 기준으로 비교하기 위해 시간/분/초 초기화
      const dateAtMidnight = new Date(date);
      dateAtMidnight.setHours(0, 0, 0, 0);

      const nowAtMidnight = new Date(now);
      nowAtMidnight.setHours(0, 0, 0, 0);

      const diffTime = nowAtMidnight.getTime() - dateAtMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "오늘";
      if (diffDays === 1) return "어제";
      if (diffDays <= 7) return `${diffDays}일 전`;
      return date.toLocaleDateString("ko-KR");
    } catch {
      return dateString;
    }
  };

  const handleCreateChannel = async () => {
    await createChannel("NewChannel", "");
  };

  const handleDeleteChannel = async (
    e: React.MouseEvent,
    channelId: string
  ) => {
    e.stopPropagation();
    if (window.confirm("이 채팅을 삭제하시겠습니까?")) {
      await deleteChannel(channelId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 새 채팅 버튼 */}
      <div className="p-4 border-b border-gray-100">
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreateChannel}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-lg"
        >
          새 채팅 시작
        </Button>
      </div>

      {/* 채팅 채널 목록 */}
      <div className="flex-1 overflow-y-auto">
        {channels.length > 0 ? (
          <div className="py-4 space-y-2">
            {channels.map((channel) => {
              const isActive = channel.meta.channelId === currentChannelId;
              return (
                <div
                  key={channel.meta.channelId}
                  className={`cursor-pointer transition-all duration-200 rounded-lg mx-3 px-3 py-3 group hover:bg-gray-100 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-50 to-blue-50 border-l-3 border-purple-500"
                      : "border border-gray-100 bg-gray-50"
                  }`}
                  onClick={() => {
                    console.log("📱 채팅 항목 클릭:", channel.meta.channelId);
                    switchChannel(channel.meta.channelId);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      {/* 제목 */}
                      <div className="mb-2">
                        <Text
                          strong={isActive}
                          className={`text-sm line-clamp-2 ${
                            isActive ? "text-purple-700" : "text-gray-800"
                          }`}
                        >
                          {channel.meta.description || channel.meta.channelName}
                        </Text>
                      </div>

                      {/* 업데이트 날짜 */}
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>{formatDate(channel.meta.updatedAt)}</span>
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="flex-shrink-0">
                      <Tooltip title="삭제">
                        <Button
                          type="text"
                          size="small"
                          icon={<Trash2 className="w-3 h-3" />}
                          danger
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 flex items-center justify-center"
                          onClick={(e) =>
                            handleDeleteChannel(e, channel.meta.channelId)
                          }
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <Text type="secondary" className="block mb-2">
              채팅 세션이 없습니다.
            </Text>
            <Button
              type="link"
              onClick={handleCreateChannel}
              className="text-purple-600 hover:text-purple-700 p-0"
            >
              첫 번째 채팅을 시작해보세요
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestChannels;
