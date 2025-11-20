import { useState } from "react";
import { Checkbox } from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SalesAnalysisReport = () => {
  const [todos, setTodos] = useState([
    {
      id: 1,
      text: "배달의민족 수수료 재협상 (14% → 12%)",
      completed: false,
      priority: "high",
    },
    {
      id: 2,
      text: "고마진 상품 라인 확대 (아이스라떼 바리에이션)",
      completed: false,
      priority: "high",
    },
    {
      id: 3,
      text: "여름 인력 계획 수립 및 에너지 효율 방안 마련",
      completed: false,
      priority: "high",
    },
    {
      id: 4,
      text: "배달 플랫폼 최적화 (요기요 집중 마케팅)",
      completed: false,
      priority: "medium",
    },
    {
      id: 5,
      text: "번들 상품 구성 검토 (음료+베이커리 세트)",
      completed: false,
      priority: "medium",
    },
  ]);

  const monthlyData = [
    { month: "1월", 매출: 27.7, 순이익: 11.0 },
    { month: "2월", 매출: 29.2, 순이익: 11.8 },
    { month: "3월", 매출: 31.7, 순이익: 13.6 },
    { month: "4월", 매출: 33.5, 순이익: 14.9 },
    { month: "5월", 매출: 34.9, 순이익: 15.7 },
    { month: "6월", 매출: 37.1, 순이익: 16.1 },
  ];

  const channelData = [
    { name: "매장 판매", value: 64, color: "#3b82f6" },
    { name: "배달 판매", value: 36, color: "#8b5cf6" },
  ];

  const platformData = [
    { platform: "요기요", sales: 34, commission: 12 },
    { platform: "쿠팡이츠", sales: 25.2, commission: 12 },
    { platform: "배달의민족", sales: 13.6, commission: 14 },
  ];

  const productData = [
    { product: "아메리카노", sales: 85.2 },
    { product: "카페라떼", sales: 48.0 },
    { product: "아이스아메리카노", sales: 32.4 },
    { product: "크로와상", sales: 16.8 },
    { product: "아이스카페라떼", sales: 14.4 },
  ];

  const improvements = [
    {
      title: "배달 수수료 최적화",
      current: "약 19.4% (평균)",
      target: "약 12.5% (목표)",
      impact: "월 200~300만원 추가 이익",
      priority: "critical",
    },
    {
      title: "상품 포트폴리오 강화",
      current: "고마진 상품 비중 낮음",
      target: "고마진 상품 30% 이상",
      impact: "월 70~100만원 추가 이익",
      priority: "critical",
    },
    {
      title: "인력 최적화",
      current: "인건비 25% (월 487만원)",
      target: "인건비 23% (월 458만원)",
      impact: "월 14~20만원 절감",
      priority: "normal",
    },
    {
      title: "여름 성수기 대비",
      current: "비용 구조 미최적화",
      target: "에너지 효율 20% 개선",
      impact: "월 50~100만원 절감",
      priority: "normal",
    },
  ];

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const completedCount = todos.filter((t) => t.completed).length;

  // 📐 Advanced Design System - Premium Minimalist
  const colors = {
    bg: {
      primary: "#fafbfc",
      secondary: "#f0f1f5",
      tertiary: "#ffffff",
      highlight: "rgba(59, 130, 246, 0.03)",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
      tertiary: "#94a3b8",
      inverted: "#ffffff",
    },
    border: {
      light: "#e2e8f0",
      medium: "#cbd5e1",
      dark: "#94a3b8",
    },
    accent: {
      blue: "#3b82f6",
      indigo: "#6366f1",
      purple: "#8b5cf6",
      emerald: "#10b981",
      orange: "#f59e0b",
      rose: "#f43f5e",
    },
  };

  const shadows = {
    xs: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
    sm: "0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)",
    md: "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
    lg: "0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
    xl: "0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.08)",
    glow: "0 0 20px rgba(59, 130, 246, 0.2)",
  };

  const spacing = {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
    xxxl: "48px",
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: colors.bg.primary,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
        radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.05) 0%, transparent 60%)
      `,
      backgroundAttachment: "fixed" as const,
    },
    // 🎨 Header - Premium Gradient
    header: {
      background: `
        linear-gradient(135deg, #3b82f6 0%, #6366f1 35%, #8b5cf6 70%, #a78bfa 100%),
        radial-gradient(circle at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 70%)
      `,
      color: "white",
      padding: `${spacing.xxxl} ${spacing.lg} ${spacing.xl}`,
      position: "relative" as const,
      overflow: "hidden",
      boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.2)",
    },
    headerContent: {
      maxWidth: "1400px",
      margin: "0 auto",
      position: "relative" as const,
      zIndex: 1,
    },
    headerTitle: {
      fontSize: "56px",
      fontWeight: "800",
      marginBottom: spacing.md,
      letterSpacing: "-0.02em",
      lineHeight: "1.1",
      textShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    headerSubtitle: {
      fontSize: "16px",
      color: "rgba(255,255,255,0.85)",
      fontWeight: "500",
      letterSpacing: "0.4px",
      lineHeight: "1.6",
      opacity: 0.95,
    },
    content: {
      maxWidth: "1400px",
      margin: "0 auto",
      padding: `${spacing.xxxl} ${spacing.lg}`,
    },
    // 📊 Metrics Grid - Enhanced
    metricsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: spacing.lg,
      marginBottom: spacing.xxxl,
    },
    metricCard: {
      backgroundColor: colors.bg.tertiary,
      borderRadius: "14px",
      boxShadow: shadows.md,
      padding: `${spacing.xl} ${spacing.xl}`,
      borderTop: "4px solid",
      position: "relative" as const,
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      cursor: "pointer",
      border: `1px solid ${colors.border.light}`,
      overflow: "hidden",
    },
    metricCardInner: {
      position: "relative" as const,
      zIndex: 1,
    },
    metricLabel: {
      fontSize: "11px",
      fontWeight: "700",
      color: colors.text.tertiary,
      marginBottom: spacing.md,
      textTransform: "uppercase" as const,
      letterSpacing: "0.9px",
      display: "flex",
      alignItems: "center",
      gap: spacing.xs,
    },
    metricValue: {
      fontSize: "40px",
      fontWeight: "800",
      color: colors.text.primary,
      lineHeight: "1",
      marginBottom: spacing.md,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    metricSubtext: {
      fontSize: "13px",
      color: colors.text.tertiary,
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: spacing.xs,
    },
    trendIndicator: {
      fontSize: "20px",
      marginLeft: "auto",
    },
    // 📈 Charts Grid
    chartsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
      gap: spacing.xl,
      marginBottom: spacing.xxxl,
    },
    chartCard: {
      backgroundColor: colors.bg.tertiary,
      borderRadius: "14px",
      boxShadow: shadows.md,
      padding: spacing.xl,
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      border: `1px solid ${colors.border.light}`,
      position: "relative" as const,
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: "18px",
      fontWeight: "700",
      color: colors.text.primary,
      marginBottom: spacing.xl,
      display: "flex",
      alignItems: "center",
      gap: spacing.md,
      letterSpacing: "-0.01em",
    },
    // 🔥 Improvements
    improvementsCard: {
      backgroundColor: colors.bg.tertiary,
      borderRadius: "14px",
      boxShadow: shadows.md,
      padding: spacing.xxl,
      marginBottom: spacing.xxxl,
      border: `1px solid ${colors.border.light}`,
    },
    improvementsTitle: {
      fontSize: "26px",
      fontWeight: "800",
      color: colors.text.primary,
      marginBottom: spacing.xxl,
      display: "flex",
      alignItems: "center",
      gap: spacing.md,
      letterSpacing: "-0.01em",
    },
    improvementsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: spacing.lg,
    },
    improvementItem: {
      padding: `${spacing.lg} ${spacing.xl}`,
      borderRadius: "12px",
      borderLeft: "5px solid",
      backgroundColor: colors.bg.secondary,
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      position: "relative" as const,
      border: `1px solid ${colors.border.light}`,
      borderLeftWidth: "5px",
    },
    improvementHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    improvementTitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: colors.text.primary,
      lineHeight: "1.4",
    },
    improvementBadge: {
      fontSize: "10px",
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: "6px",
      fontWeight: "700",
      whiteSpace: "nowrap" as const,
      textTransform: "uppercase" as const,
      letterSpacing: "0.6px",
      display: "inline-block",
      boxShadow: shadows.xs,
    },
    improvementText: {
      fontSize: "13px",
      color: colors.text.secondary,
      lineHeight: "1.6",
      marginBottom: spacing.sm,
      fontWeight: "500",
    },
    improvementImpact: {
      fontSize: "14px",
      fontWeight: "700",
      color: colors.accent.emerald,
      marginTop: spacing.md,
      display: "flex",
      alignItems: "center",
      gap: spacing.sm,
    },
    // ✓ Todo
    todoCard: {
      backgroundColor: colors.bg.tertiary,
      borderRadius: "14px",
      boxShadow: shadows.md,
      padding: spacing.xxl,
      marginBottom: spacing.xxxl,
      border: `1px solid ${colors.border.light}`,
    },
    todoHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xxl,
      paddingBottom: spacing.lg,
      borderBottom: `2px solid ${colors.border.light}`,
    },
    todoTitle: {
      fontSize: "26px",
      fontWeight: "800",
      color: colors.text.primary,
      display: "flex",
      alignItems: "center",
      gap: spacing.md,
      letterSpacing: "-0.01em",
    },
    todoCount: {
      fontSize: "32px",
      fontWeight: "800",
      background: `linear-gradient(135deg, ${colors.accent.blue} 0%, ${colors.accent.indigo} 100%)`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textAlign: "right" as const,
    },
    todoCountLabel: {
      fontSize: "11px",
      color: colors.text.tertiary,
      fontWeight: "700",
      letterSpacing: "0.5px",
      textTransform: "uppercase" as const,
    },
    progressBar: {
      marginBottom: spacing.xxl,
    },
    progressLabel: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      fontSize: "12px",
      fontWeight: "700",
      color: colors.text.secondary,
      letterSpacing: "0.5px",
    },
    progressFill: {
      width: "100%",
      height: "8px",
      backgroundColor: colors.border.light,
      borderRadius: "10px",
      overflow: "hidden",
      position: "relative" as const,
    },
    progressInner: {
      height: "100%",
      background: `linear-gradient(90deg, ${colors.accent.blue} 0%, ${colors.accent.indigo} 100%)`,
      transition: "width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      borderRadius: "10px",
      boxShadow: shadows.glow,
    },
    todoList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: spacing.md,
    },
    todoItem: {
      display: "flex",
      alignItems: "center",
      gap: spacing.lg,
      padding: `${spacing.lg} ${spacing.lg}`,
      borderRadius: "10px",
      border: `1.5px solid ${colors.border.light}`,
      backgroundColor: colors.bg.tertiary,
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      cursor: "pointer",
      position: "relative" as const,
    },
    todoItemCompleted: {
      backgroundColor: "#f0fdf4",
      borderColor: "#dcfce7",
      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
    },
    todoText: {
      flex: 1,
      fontSize: "14px",
      color: colors.text.primary,
      fontWeight: "500",
      lineHeight: "1.5",
    },
    todoTextCompleted: {
      textDecoration: "line-through",
      color: colors.text.tertiary,
      fontWeight: "400",
    },
    todoPriority: {
      fontSize: "10px",
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: "6px",
      fontWeight: "700",
      whiteSpace: "nowrap" as const,
      textTransform: "uppercase" as const,
      letterSpacing: "0.6px",
      display: "inline-block",
      boxShadow: shadows.xs,
    },
    // Conclusion
    conclusionCard: {
      background: `linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)`,
      border: `2px solid ${colors.accent.emerald}`,
      borderRadius: "14px",
      padding: `${spacing.xl} ${spacing.xl}`,
      display: "flex",
      gap: spacing.lg,
      position: "relative" as const,
      overflow: "hidden",
    },
    conclusionIcon: {
      fontSize: "32px",
      marginTop: spacing.xs,
      minWidth: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    conclusionContent: {
      flex: 1,
    },
    conclusionTitle: {
      fontSize: "20px",
      fontWeight: "800",
      color: colors.text.primary,
      marginBottom: spacing.md,
      letterSpacing: "-0.01em",
    },
    conclusionText: {
      fontSize: "14px",
      color: colors.text.secondary,
      lineHeight: "1.8",
      fontWeight: "500",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>더블샷 카페</h1>
          <p style={styles.headerSubtitle}>
            매출분석 보고서 | 2025년 1월~6월 | 강남역 3번 출구
          </p>
        </div>
      </div>

      <div style={styles.content}>
        {/* Key Metrics */}
        <div style={styles.metricsGrid}>
          <div
            className="metric-card"
            style={{ ...styles.metricCard, borderTopColor: colors.accent.blue }}
          >
            <div style={styles.metricCardInner}>
              <div style={styles.metricLabel}>
                <span>총 매출액 (6개월)</span>
              </div>
              <div style={styles.metricValue}>2.2억원</div>
              <div style={styles.metricSubtext}>↑ 월평균 3,660만원</div>
            </div>
          </div>

          <div
            className="metric-card"
            style={{
              ...styles.metricCard,
              borderTopColor: colors.accent.emerald,
            }}
          >
            <div style={styles.metricCardInner}>
              <div style={styles.metricLabel}>순이익 (6개월)</div>
              <div style={styles.metricValue}>9,025만원</div>
              <div style={styles.metricSubtext}>↑ 월평균 1,504만원</div>
            </div>
          </div>

          <div
            className="metric-card"
            style={{
              ...styles.metricCard,
              borderTopColor: colors.accent.purple,
            }}
          >
            <div style={styles.metricCardInner}>
              <div style={styles.metricLabel}>평균 이익률</div>
              <div style={styles.metricValue}>44.7%</div>
              <div style={styles.metricSubtext}>→ 우수한 수익성 유지</div>
            </div>
          </div>

          <div
            className="metric-card"
            style={{
              ...styles.metricCard,
              borderTopColor: colors.accent.orange,
            }}
          >
            <div style={styles.metricCardInner}>
              <div style={styles.metricLabel}>월별 성장률</div>
              <div style={styles.metricValue}>8.15%</div>
              <div style={styles.metricSubtext}>↑ 지속적 성장세</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={styles.chartsGrid}>
          {/* Monthly Sales Trend */}
          <div className="chart-card" style={styles.chartCard}>
            <h2 style={styles.chartTitle}>📈 월별 매출 & 순이익 추이</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    boxShadow: shadows.lg,
                  }}
                  formatter={(value) => `${value}백만원`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="매출"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 5 }}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="순이익"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 5 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Distribution */}
          <div className="chart-card" style={styles.chartCard}>
            <h2 style={styles.chartTitle}>🥧 채널별 매출 분포</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  ></div>
                  <span
                    style={{
                      fontSize: "14px",
                      color: colors.text.secondary,
                      fontWeight: "500",
                    }}
                  >
                    <strong>매장 판매:</strong> 1억 2,935만원 (64%)
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#8b5cf6",
                    }}
                  ></div>
                  <span
                    style={{
                      fontSize: "14px",
                      color: colors.text.secondary,
                      fontWeight: "500",
                    }}
                  >
                    <strong>배달 판매:</strong> 7,280만원 (36%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform & Products Section */}
        <div style={styles.chartsGrid}>
          {/* Platform Performance */}
          <div className="chart-card" style={styles.chartCard}>
            <h2 style={styles.chartTitle}>🏪 배달 플랫폼별 성과</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="platform" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    boxShadow: shadows.lg,
                  }}
                />
                <Legend />
                <Bar
                  dataKey="sales"
                  fill="#3b82f6"
                  name="매출(백만원)"
                  isAnimationActive={true}
                />
                <Bar
                  dataKey="commission"
                  fill="#f43f5e"
                  name="수수료율(%)"
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="chart-card" style={styles.chartCard}>
            <h2 style={styles.chartTitle}>☕ 상위 5개 상품</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={productData}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis
                  dataKey="product"
                  type="category"
                  stroke="#94a3b8"
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    boxShadow: shadows.lg,
                  }}
                  formatter={(value) => `${value}백만원`}
                />
                <Bar dataKey="sales" fill="#8b5cf6" isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Improvements Section */}
        <div style={styles.improvementsCard}>
          <h2 style={styles.improvementsTitle}>🔥 개선 항목 및 예상 효과</h2>
          <div style={styles.improvementsGrid}>
            {improvements.map((improvement, idx) => (
              <div
                key={idx}
                className="improvement-item"
                style={{
                  ...styles.improvementItem,
                  backgroundColor:
                    improvement.priority === "critical" ? "#fef2f2" : "#eff6ff",
                  borderLeftColor:
                    improvement.priority === "critical"
                      ? colors.accent.rose
                      : colors.accent.indigo,
                }}
              >
                <div style={styles.improvementHeader}>
                  <h3 style={styles.improvementTitle}>{improvement.title}</h3>
                  <span
                    style={{
                      ...styles.improvementBadge,
                      backgroundColor:
                        improvement.priority === "critical"
                          ? "#fee2e2"
                          : "#dbeafe",
                      color:
                        improvement.priority === "critical"
                          ? "#991b1b"
                          : "#1e40af",
                    }}
                  >
                    {improvement.priority === "critical" ? "최우선" : "일반"}
                  </span>
                </div>
                <p style={styles.improvementText}>
                  <strong>현황:</strong> {improvement.current}
                </p>
                <p style={styles.improvementText}>
                  <strong>목표:</strong> {improvement.target}
                </p>
                <p style={styles.improvementImpact}>💰 {improvement.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Todo Checklist */}
        <div style={styles.todoCard}>
          <div style={styles.todoHeader}>
            <div style={styles.todoTitle}>✓ 실행 To-Do 체크리스트</div>
            <div>
              <div style={styles.todoCount}>
                {completedCount}/{todos.length}
              </div>
              <div style={styles.todoCountLabel}>완료</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={styles.progressBar}>
            <div style={styles.progressLabel}>
              <span>진행도</span>
              <span>{Math.round((completedCount / todos.length) * 100)}%</span>
            </div>
            <div style={styles.progressFill}>
              <div
                style={{
                  ...styles.progressInner,
                  width: `${(completedCount / todos.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Todo Items */}
          <div style={styles.todoList}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="todo-item"
                style={{
                  ...styles.todoItem,
                  ...(todo.completed ? styles.todoItemCompleted : {}),
                }}
              >
                <Checkbox
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  color="primary"
                />
                <span
                  style={{
                    ...styles.todoText,
                    ...(todo.completed ? styles.todoTextCompleted : {}),
                  }}
                >
                  {todo.text}
                </span>
                <span
                  style={{
                    ...styles.todoPriority,
                    backgroundColor:
                      todo.priority === "high" ? "#fee2e2" : "#fef3c7",
                    color: todo.priority === "high" ? "#991b1b" : "#92400e",
                  }}
                >
                  {todo.priority === "high" ? "높음" : "중간"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Alert */}
        <div style={styles.conclusionCard}>
          <div style={styles.conclusionIcon}>⚡</div>
          <div style={styles.conclusionContent}>
            <h3 style={styles.conclusionTitle}>결론</h3>
            <p style={styles.conclusionText}>
              더블샷 카페는 <strong>건강한 성장세</strong>를 유지하고 있습니다.
              월 평균 <strong>1,504만원의 순이익</strong>을 기록하고 있으며,
              위의 개선 사항을 실행하면{" "}
              <strong>월 1,500만원대의 순이익 달성</strong>이 충분히 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisReport;
