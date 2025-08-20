import React, { useState, useCallback, useEffect } from "react";
import { Card, Row, Col, Badge, Typography, Button, Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import { useChatActions } from "@/core";
import {
  BarChartOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  RiseOutlined,
  PieChartOutlined,
  LineChartOutlined,
  FundOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  RadarChartOutlined,
  BoxPlotOutlined,
  HeatMapOutlined,
} from "@ant-design/icons";
import { MenuOption } from "./Menu";

const { Text, Title } = Typography;

// 지원되는 시각화 타입들
export type VisualizationType =
  | "comparison"
  | "kpi-dashboard"
  | "geo-spatial"
  | "trend"
  | "distribution"
  | "correlation"
  | "time-series"
  | "scatter"
  | "heatmap"
  | "network"
  | "treemap"
  | "funnel"
  | "gauge"
  | "radar"
  | "box-plot"
  | "candlestick"
  | "sankey";

// 시각화 메타데이터 인터페이스
interface VisualizationMeta {
  title: string;
  icon: React.ReactNode;
  color: string;
  sampleImage: string;
  description: string;
  category?:
    | "statistical"
    | "business"
    | "geographical"
    | "temporal"
    | "relational";
}

interface VisualizationRecommendation {
  visualization_type: string;
  confidence: number;
  reason: string;
  data_requirements: string[];
  benefits: string[];
}

interface VisualizeProps {
  visualizeList: VisualizationRecommendation[];
  onOptionSelect: (option: MenuOption) => void;
}

// 시각화 타입별 메타데이터 (확장 가능한 구조)
const visualizationMeta: Record<VisualizationType, VisualizationMeta> = {
  // 비즈니스 분석
  comparison: {
    title: "비교 분석",
    icon: <BarChartOutlined className="text-2xl" />,
    color: "#1890ff",
    sampleImage: "📊",
    description: "여러 데이터를 비교하여 차이점을 분석합니다",
    category: "business",
  },
  "kpi-dashboard": {
    title: "KPI 대시보드",
    icon: <DashboardOutlined className="text-2xl" />,
    color: "#52c41a",
    sampleImage: "📈",
    description: "핵심 성과 지표를 한눈에 확인할 수 있습니다",
    category: "business",
  },

  // 지리 분석
  "geo-spatial": {
    title: "지리 공간 분석",
    icon: <EnvironmentOutlined className="text-2xl" />,
    color: "#fa8c16",
    sampleImage: "🗺️",
    description: "지도 기반으로 위치 데이터를 시각화합니다",
    category: "geographical",
  },

  // 시계열 분석
  trend: {
    title: "트렌드 분석",
    icon: <RiseOutlined className="text-2xl" />,
    color: "#722ed1",
    sampleImage: "📈",
    description: "시간에 따른 데이터 변화를 분석합니다",
    category: "temporal",
  },
  "time-series": {
    title: "시계열 분석",
    icon: <LineChartOutlined className="text-2xl" />,
    color: "#1890ff",
    sampleImage: "📉",
    description: "시간 기반 데이터의 패턴과 추세를 분석합니다",
    category: "temporal",
  },

  // 통계 분석
  distribution: {
    title: "분포 분석",
    icon: <PieChartOutlined className="text-2xl" />,
    color: "#eb2f96",
    sampleImage: "🥧",
    description: "데이터의 분포와 비율을 확인합니다",
    category: "statistical",
  },
  correlation: {
    title: "상관관계 분석",
    icon: <DotChartOutlined className="text-2xl" />,
    color: "#13c2c2",
    sampleImage: "📋",
    description: "변수 간의 관계를 분석합니다",
    category: "statistical",
  },
  scatter: {
    title: "산점도 분석",
    icon: <DotChartOutlined className="text-2xl" />,
    color: "#52c41a",
    sampleImage: "🔸",
    description: "두 변수 간의 관계를 점으로 표현합니다",
    category: "statistical",
  },
  "box-plot": {
    title: "박스 플롯",
    icon: <BoxPlotOutlined className="text-2xl" />,
    color: "#fa541c",
    sampleImage: "📦",
    description: "데이터의 분포와 이상값을 분석합니다",
    category: "statistical",
  },

  // 고급 시각화
  heatmap: {
    title: "히트맵",
    icon: <HeatMapOutlined className="text-2xl" />,
    color: "#ff4d4f",
    sampleImage: "🔥",
    description: "데이터 밀도를 색상으로 표현합니다",
    category: "statistical",
  },
  radar: {
    title: "레이더 차트",
    icon: <RadarChartOutlined className="text-2xl" />,
    color: "#722ed1",
    sampleImage: "📡",
    description: "다차원 데이터를 방사형으로 표현합니다",
    category: "statistical",
  },
  treemap: {
    title: "트리맵",
    icon: <AreaChartOutlined className="text-2xl" />,
    color: "#52c41a",
    sampleImage: "🌳",
    description: "계층적 데이터를 사각형으로 표현합니다",
    category: "statistical",
  },

  // 관계형 분석
  network: {
    title: "네트워크 분석",
    icon: <DotChartOutlined className="text-2xl" />,
    color: "#13c2c2",
    sampleImage: "🕸️",
    description: "노드와 엣지로 관계를 표현합니다",
    category: "relational",
  },
  sankey: {
    title: "산키 다이어그램",
    icon: <FundOutlined className="text-2xl" />,
    color: "#fa8c16",
    sampleImage: "🌊",
    description: "플로우와 관계를 시각화합니다",
    category: "relational",
  },

  // 비즈니스 전용
  funnel: {
    title: "퍼널 차트",
    icon: <FundOutlined className="text-2xl" />,
    color: "#eb2f96",
    sampleImage: "🔻",
    description: "단계별 변환율을 분석합니다",
    category: "business",
  },
  gauge: {
    title: "게이지 차트",
    icon: <DashboardOutlined className="text-2xl" />,
    color: "#fa541c",
    sampleImage: "⏱️",
    description: "목표 대비 현재 상태를 표시합니다",
    category: "business",
  },
  candlestick: {
    title: "캔들스틱 차트",
    icon: <BarChartOutlined className="text-2xl" />,
    color: "#52c41a",
    sampleImage: "🕯️",
    description: "주가나 거래 데이터를 분석합니다",
    category: "business",
  },
};

const Visualize = ({ visualizeList, onOptionSelect }: VisualizeProps) => {
  const { updateMessage } = useChatActions();

  const [selectedVisualization, setSelectedVisualization] = useState<
    string | null
  >(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Flag와 추천 데이터 분리
  let visualizeFlag:
    | {
        __type: string;
        id: string;
        selected: string;
      }
    | undefined = undefined;

  let recommendations: VisualizationRecommendation[] = [];

  // 첫 번째 항목이 플래그인지 확인
  if (Array.isArray(visualizeList) && visualizeList.length > 0) {
    try {
      const firstItem = visualizeList[0];
      if (typeof firstItem === "string") {
        const parsed = JSON.parse(firstItem);
        if (parsed?.__type === "DATA_VISUALIZE-FLAG") {
          visualizeFlag = parsed;
          recommendations = visualizeList.slice(
            1
          ) as VisualizationRecommendation[];
        }
      } else {
        recommendations = visualizeList;
      }
    } catch {
      recommendations = visualizeList;
    }
  }

  // 기본값을 포함한 메타데이터 가져오기 함수
  const getVisualizationMeta = (type: string): VisualizationMeta => {
    return (
      visualizationMeta[type as VisualizationType] || {
        title: type.charAt(0).toUpperCase() + type.slice(1),
        icon: <BarChartOutlined className="text-2xl" />,
        color: "#666666",
        sampleImage: "📊",
        description: "데이터 시각화",
        category: "business",
      }
    );
  };

  const handleSubmit = useCallback(() => {
    if (selectedVisualization) {
      if (visualizeFlag) {
        updateMessage(visualizeFlag.id, {
          componentData: [
            JSON.stringify({
              ...visualizeFlag,
              selected: selectedVisualization,
            }),
            ...recommendations,
          ],
        });
      }
      setIsSubmitted(true);
      onOptionSelect({
        value: "BUILD",
        label: selectedVisualization,
      });
    }
  }, [
    visualizeFlag,
    selectedVisualization,
    recommendations,
    updateMessage,
    onOptionSelect,
  ]);

  // 초기 선택값 설정
  useEffect(() => {
    if (recommendations.length > 0 && !selectedVisualization) {
      if (visualizeFlag && visualizeFlag.selected !== "") {
        // 이미 선택된 값이 있으면 복원
        setSelectedVisualization(visualizeFlag.selected);
        setIsSubmitted(true);
        return;
      }

      // confidence가 가장 높은 값을 기본 선택
      const highestConfidence = recommendations.reduce((prev, current) =>
        prev.confidence > current.confidence ? prev : current
      );
      setSelectedVisualization(highestConfidence.visualization_type);
      setIsSubmitted(false);
    }
  }, [recommendations, visualizeFlag]);

  return (
    <div className="w-full">
      <Title level={4} className="m-4 mt-2">
        추천 시각화 타입
      </Title>

      <div className="w-full overflow-x-auto pb-4">
        <Row className="m-2 gap-4">
          {recommendations.map((recommendation, index) => {
            const meta = getVisualizationMeta(
              recommendation.visualization_type
            );

            const isSelected =
              selectedVisualization === recommendation.visualization_type;

            return (
              <Col
                key={index}
                className="flex-shrink-0"
                style={{ width: "300px" }}
              >
                <Card
                  hoverable={!isSubmitted}
                  size="small"
                  className={`${
                    isSubmitted
                      ? isSelected
                        ? "cursor-default" // 선택된 카드는 기본 커서
                        : "cursor-not-allowed opacity-60 bg-gray-50" // 선택되지 않은 카드는 비활성화
                      : "cursor-pointer hover:shadow-md transition-all duration-200"
                  } ${
                    isSelected ? "border-2 shadow-lg" : "border border-gray-200"
                  }`}
                  style={{
                    borderColor:
                      selectedVisualization ===
                      recommendation.visualization_type
                        ? meta.color // 선택된 카드는 항상 원래 색상 유지
                        : undefined,
                  }}
                  onClick={() => {
                    if (!isSubmitted) {
                      setSelectedVisualization(
                        recommendation.visualization_type
                      );
                    }
                  }}
                  cover={
                    <div
                      className={`h-20 flex items-center justify-center text-3xl relative ${
                        isSubmitted && !isSelected
                          ? "opacity-60" // 선택되지 않은 카드만 흐리게
                          : ""
                      }`}
                      style={{
                        backgroundColor:
                          isSubmitted && !isSelected
                            ? "#f5f5f5" // 선택되지 않은 카드만 회색
                            : `${meta.color}10`, // 선택된 카드는 원래 색상 유지
                      }}
                    >
                      <div className="p-2">{meta.sampleImage}</div>
                    </div>
                  }
                >
                  <Card.Meta
                    title={
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {meta.title}
                        </span>
                        <Badge
                          count={`${recommendation.confidence}%`}
                          style={{
                            backgroundColor:
                              isSubmitted && !isSelected
                                ? "#d9d9d9" // 선택되지 않은 카드만 회색
                                : meta.color, // 선택된 카드는 원래 색상 유지
                            fontSize: "10px",
                          }}
                        />
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <Text
                          className={`text-xs block ${
                            isSubmitted && !isSelected
                              ? "text-gray-400" // 선택되지 않은 카드만 흐리게
                              : "text-gray-600" // 선택된 카드는 원래 색상 유지
                          }`}
                        >
                          {meta.description}
                        </Text>

                        <div>
                          <Text
                            strong
                            className={`text-xs ${
                              isSubmitted && !isSelected
                                ? "text-gray-400" // 선택되지 않은 카드만 흐리게
                                : "text-gray-700" // 선택된 카드는 원래 색상 유지
                            }`}
                          >
                            추천 이유:
                          </Text>
                          <Text
                            className={`text-xs block mt-1 line-clamp-2 ${
                              isSubmitted && !isSelected
                                ? "text-gray-400" // 선택되지 않은 카드만 흐리게
                                : "text-gray-600" // 선택된 카드는 원래 색상 유지
                            }`}
                          >
                            {recommendation.reason}
                          </Text>
                        </div>

                        <div>
                          <Text
                            strong
                            className={`text-xs ${
                              isSubmitted && !isSelected
                                ? "text-gray-400" // 선택되지 않은 카드만 흐리게
                                : "text-gray-700" // 선택된 카드는 원래 색상 유지
                            }`}
                          >
                            필요 데이터:
                          </Text>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {recommendation.data_requirements
                              // .slice(0, 2)
                              .map((req, idx) => (
                                <Badge
                                  key={idx}
                                  count={req}
                                  style={{
                                    backgroundColor: "#f0f0f0",
                                    color: "#666",
                                    fontSize: "9px",
                                  }}
                                />
                              ))}
                            {/* {recommendation.data_requirements.length > 2 && (
                              <Badge
                                count={`+${
                                  recommendation.data_requirements.length - 2
                                }`}
                                style={{
                                  backgroundColor: "#d9d9d9",
                                  color: "#666",
                                  fontSize: "9px",
                                }}
                              />
                            )} */}
                          </div>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* 선택 완료 버튼 */}
      <div className="mt-4 ml-2 mb-2 flex">
        <Button
          type="primary"
          onClick={handleSubmit}
          disabled={isSubmitted || !selectedVisualization}
          className={`${
            isSubmitted ? "cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isSubmitted ? "선택 완료됨" : "선택 완료"}
        </Button>
      </div>
    </div>
  );
};

export default Visualize;
