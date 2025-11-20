import { useState, useCallback, useEffect } from "react";

export interface TestChannelMeta {
  channelId: string;
  channelName: string;
  description: string;
  threadId?: string;
  threadStatus: "IDLE" | "CONNECTING" | "SENDING" | "RECEIVING" | "RECONNECTING" | "ERROR";
  uploadedCode?: string;
  currentProcess?: string;
  isCompleted?: boolean;
  updatedAt?: string;
  messages?: Array<{
    id: string;
    type: "human" | "ai";
    content: string;
    timestamp: string;
    status?: "streaming" | "completed";
    showArtifactButton?: boolean;
    artifactUrl?: string;
    artifactTitle?: string;
    artifactDescription?: string;
    isGeneratingArtifact?: boolean;
  }>;
}

export interface TestChannel {
  meta: TestChannelMeta;
}

interface UseTestChannelOptions {
  autoLoad?: boolean;
}

/**
 * 테스트 모드용 채널 훅
 * 휘발성 (localStorage 저장 안 함) - 새로고침하면 초기화
 */
export const useTestChannel = (options: UseTestChannelOptions = {}) => {
  // 메모리에만 저장 (휘발성)
  const [channels, setChannels] = useState<TestChannel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

  // 새 채널 생성
  const createChannel = useCallback(
    async (name: string, description: string) => {
      const channelId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const threadId = `thread-${Date.now()}`;

      const newChannel: TestChannel = {
        meta: {
          channelId,
          channelName: name,
          description,
          threadId,
          threadStatus: "IDLE",
          currentProcess: "TOPIC",
          isCompleted: false,
          updatedAt: new Date().toISOString(),
        },
      };

      // 새 채널을 맨 위에 추가
      setChannels((prev) => [newChannel, ...prev]);
      setCurrentChannelId(channelId);

      console.log(`✅ 테스트 채널 생성: ${channelId}`);
      return channelId;
    },
    []
  );

  // 채널 전환
  const switchChannel = useCallback(async (channelId: string) => {
    const channel = channels.find((c) => c.meta.channelId === channelId);
    if (channel) {
      setCurrentChannelId(channelId);
      console.log(`✅ 채널 전환: ${channelId}`);
      return true;
    }
    console.warn(`❌ 채널을 찾을 수 없음: ${channelId}`);
    return false;
  }, [channels]);

  // 채널 삭제
  const deleteChannel = useCallback(async (channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.meta.channelId !== channelId));

    if (currentChannelId === channelId) {
      const remainingChannels = channels.filter(
        (c) => c.meta.channelId !== channelId
      );
      if (remainingChannels.length > 0) {
        setCurrentChannelId(remainingChannels[0].meta.channelId);
      } else {
        setCurrentChannelId(null);
      }
    }

    console.log(`✅ 채널 삭제: ${channelId}`);
    return true;
  }, [channels, currentChannelId]);

  // 현재 채널 메타 업데이트
  const updateChannelMeta = useCallback(
    async (
      channelId: string,
      updates: Partial<TestChannelMeta>
    ) => {
      setChannels((prev) =>
        prev.map((c) =>
          c.meta.channelId === channelId
            ? {
                ...c,
                meta: { ...c.meta, ...updates },
              }
            : c
        )
      );
    },
    []
  );

  // 자동 로드 - 빈 상태로 시작 (TestMain에서 새로운 채널 생성)
  useEffect(() => {
    if (options.autoLoad !== false && channels.length === 0) {
      // 빈 채널 목록으로 시작
      setChannels([]);
      setCurrentChannelId(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentChannel = channels.find(
    (c) => c.meta.channelId === currentChannelId
  );

  // 채널 목록을 isActive 필드와 함께 반환 (Channels 컴포넌트 호환)
  const channelsWithActive = channels.map((channel) => ({
    ...channel,
    isActive: channel.meta.channelId === currentChannelId,
  }));

  return {
    // State
    channels,
    channelsWithActive,
    currentChannel,
    currentChannelId,

    // Actions
    createChannel,
    switchChannel,
    deleteChannel,
    updateChannelMeta,

    // Computed
    hasChannels: channels.length > 0,
    isChannelLoading: false,
    isApiLoading: false,
  };
};
