import { useState, useEffect, useRef } from "react";
import { Typography, Card } from "antd";
import { getGuidesections } from "./Guide";

const { Title, Paragraph } = Typography;

const Intro = () => {
  const guidesections = getGuidesections();
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const totalSections = guidesections.length + 1; // +1 for hero section

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isScrolling.current) return;

      const delta = e.deltaY;
      let nextSection = currentSection;

      if (delta > 0 && currentSection < totalSections - 1) {
        nextSection = currentSection + 1;
      } else if (delta < 0 && currentSection > 0) {
        nextSection = currentSection - 1;
      }

      if (nextSection !== currentSection) {
        scrollToSection(nextSection);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrolling.current) return;

      let nextSection = currentSection;

      if (
        (e.key === "ArrowDown" || e.key === "PageDown") &&
        currentSection < totalSections - 1
      ) {
        nextSection = currentSection + 1;
      } else if (
        (e.key === "ArrowUp" || e.key === "PageUp") &&
        currentSection > 0
      ) {
        nextSection = currentSection - 1;
      }

      if (nextSection !== currentSection) {
        scrollToSection(nextSection);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [currentSection, totalSections]);

  const scrollToSection = (sectionIndex: number) => {
    if (isScrolling.current) return;

    isScrolling.current = true;
    setCurrentSection(sectionIndex);

    const container = containerRef.current;
    if (container) {
      const containerHeight = container.clientHeight; // 실제 컨테이너 높이 사용
      container.scrollTo({
        top: sectionIndex * containerHeight,
        behavior: "smooth",
      });
    }

    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrolling.current = false;
    }, 1000);
  };

  const handleNavigationClick = (index: number) => {
    scrollToSection(index);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Navigation */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: totalSections }, (_, index) => (
          <button
            key={index}
            onClick={() => handleNavigationClick(index)}
            className={`w-3 h-3 rounded-full border-2 border-white transition-all duration-300 hover:scale-125 ${
              currentSection === index ? "bg-white" : "bg-transparent"
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Fullpage Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
      >
        {/* Hero Section */}
        <div
          className="w-full h-full flex-shrink-0"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="wave-animation w-full h-full flex items-center justify-center relative">
            <div className="text-center text-white z-10 px-4">
              <Title
                level={1}
                className="text-white mb-6 text-4xl md:text-6xl font-bold"
              >
                VibeCraft
              </Title>
              <Paragraph className="text-white/90 text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                LLM과 MCP 기반으로 자연어 프롬프트만으로
                <br />
                10분 안에 맞춤형 데이터 시각화 대시보드를 만들어보세요
              </Paragraph>
              <div className="text-white/80 text-lg mt-8">
                아래로 스크롤하여 더 자세한 가이드를 확인하세요 ↓
              </div>
            </div>
          </div>
        </div>

        {/* Guide Sections */}
        {guidesections.map((section, index) => (
          <div
            key={index}
            className="w-full h-full flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <div
              className={`bg-gradient-to-br ${section.color} w-full h-full flex items-center justify-center px-4`}
            >
              <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <div className="text-center md:text-left">
                  <div className="flex justify-center md:justify-start mb-6">
                    {section.icon}
                  </div>
                  <Title level={2} className="text-white mb-4">
                    {section.title}
                  </Title>
                  <Title level={3} className="text-white/90 mb-6 font-normal">
                    {section.subtitle}
                  </Title>
                  <Paragraph className="text-white/80 text-lg mb-6">
                    {section.description}
                  </Paragraph>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <Paragraph className="text-white/90 text-sm mb-0">
                      예시: {section.example}
                    </Paragraph>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Card
                    className="w-80 h-60 bg-white/10 backdrop-blur-md border-white/20"
                    styles={{
                      body: {
                        padding: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      },
                    }}
                  >
                    <div className="text-center text-white">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="text-2xl">🎯</div>
                      </div>
                      <Paragraph className="text-white/90 mb-0">
                        Sample GIF Placeholder
                      </Paragraph>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Intro;
