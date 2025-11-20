import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface StreamingLoadProps {
  className?: string;
  text?: string;
}

const StreamingLoad = ({
  className,
  text = "답변 생성중",
}: StreamingLoadProps) => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500); // 0.5초마다 변경

    return () => clearInterval(interval);
  }, []);

  const dots = ".".repeat(dotCount);

  return (
    <div
      className={clsx(
        "mt-2 flex items-center text-gray-500 text-sm font-medium",
        className
      )}
    >
      <span>{text}</span>
      <span className="inline-block min-w-[1.5em] text-left font-bold text-gray-500 animate-pulse">
        {dots}
      </span>
    </div>
  );
};

export default StreamingLoad;
