import { Database, BarChart3, Zap, Globe } from "lucide-react";

export const getGuidesections = () => {
  return [
    {
      title: "Topic",
      subtitle: "주제 설정",
      description: "자연어로 원하는 데이터 분석 주제를 입력하세요",
      icon: <Database className="w-16 h-16 text-white" />,
      example: '"매출 데이터와 계절별 트렌드 분석"',
      color: "from-blue-500 to-purple-600",
    },
    {
      title: "Data",
      subtitle: "데이터 수집",
      description: "AI가 자동으로 관련 데이터를 수집하고 정제합니다",
      icon: <BarChart3 className="w-16 h-16 text-white" />,
      example: "CSV, JSON, API 등 다양한 소스 지원",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Build",
      subtitle: "시각화 구축",
      description: "맞춤형 차트와 대시보드를 자동으로 생성합니다",
      icon: <Zap className="w-16 h-16 text-white" />,
      example: "차트, 지도, 통계 분석 자동 생성",
      color: "from-pink-500 to-red-500",
    },
    {
      title: "Deploy",
      subtitle: "배포 완료",
      description: "완성된 대시보드를 즉시 배포하고 공유하세요",
      icon: <Globe className="w-16 h-16 text-white" />,
      example: "원클릭 배포로 즉시 공유 가능",
      color: "from-red-500 to-orange-500",
    },
  ];
};
