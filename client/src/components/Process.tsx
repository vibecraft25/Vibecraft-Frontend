import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Typography, Empty, Spin, Badge } from "antd";
import { MessageSquare, User, Bot, Target, Database, Wrench, Rocket, LucideIcon } from "lucide-react";
import { SSEMessage } from "@/hooks/useSSE";
import { ThreadState, ProcessStatus } from "@/types/session";

const { Text } = Typography;

interface ProcessProps {
  threadState?: ThreadState
  processStatus: ProcessStatus
  fetchProcess: (status: ProcessStatus) => void
  // onChangeProcess:
}

const StatusConfig : {
  status : ProcessStatus
    icon: LucideIcon;
    text: string;
    color: string;
}[]= [
  { status : "TOPIC", icon: Target, text: "주제 설정", color: "#1890ff" },
  { status : "DATA", icon: Database, text: "데이터 수집", color: "#52c41a" },
  { status : "BUILD", icon: Wrench, text: "대시보드 구축", color: "#fa8c16" },
  {status :  "DEPLOY", icon: Rocket, text: "배포", color: "#722ed1" },
]

const Process = ({threadState, processStatus, fetchProcess} : ProcessProps) => {
  // const config = StatusConfig[status];
  // const Icon = config.icon;

  console.log(threadState)

  const handleProcessClick = useCallback((status : ProcessStatus) => {
    fetchProcess(status)
  }, [])

  return (
    <div className="flex gap-16 p-4 border-b border-gray-100">
        {StatusConfig.map((config) => {
          const Icon = config.icon;

          const isProcessing = processStatus === config.status

          const color = isProcessing ? config.color : config.color
          const opacity = isProcessing ? "" : "opacity-30"

          return (
            <div className={`flex flex-1 justify-between items-center gap-2 px-3 py-2 rounded-lg border${isProcessing ? "-2" : ""} ${opacity}`}
            style={{ borderColor: color }}
            onClick={()=>handleProcessClick(config.status)}
            >
              <Icon className="w-4 h-4" style={{ color: color }} />
              <Text className="text-sm font-medium" style={{ color: color }}>
                {config.text}
              </Text>
              <Badge status={isProcessing ? "processing" : "default" } color={color}/>
            </div>
          )
        })}
    </div>
  )
}

export default Process