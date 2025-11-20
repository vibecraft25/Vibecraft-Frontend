import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface StreamingLoadProps {
  className?: string;
  text?: string;
  textcolor?: string;
}

const StreamingLoad = ({
  className,
  text = "답변 생성중",
  textcolor = "gray-500",
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
        "mt-2 flex items-center text-xs font-medium",
        className,
        `text-${textcolor}`
      )}
    >
      <span>{text}</span>
      <span
        className={clsx(
          "inline-block min-w-[1.5em] text-left font-bold animate-pulse",
          `text-${textcolor}`
        )}
      >
        {dots}
      </span>
    </div>
  );
};

export default StreamingLoad;
