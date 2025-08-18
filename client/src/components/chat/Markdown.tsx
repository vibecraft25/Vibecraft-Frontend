import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Copy } from "lucide-react";

interface MarkdownProps {
  content: string | undefined;
}

const Markdown = ({ content }: MarkdownProps) => {
  // 코드 복사 기능
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const markdownComponents = {
    // 코드 블록 (```로 감싸진 코드)
    pre: ({ children, ...props }: any) => {
      const codeContent = children?.props?.children || "";
      const language =
        children?.props?.className?.replace("language-", "") || "";

      return (
        <div className="relative group my-4">
          <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 rounded-t-lg">
            <span className="text-sm font-medium text-gray-300">
              {language ? language.toUpperCase() : "CODE"}
            </span>
            <button
              onClick={() => copyToClipboard(codeContent)}
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <Copy className="w-4 h-4" />
              <span className="text-xs">복사</span>
            </button>
          </div>
          <pre
            className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 overflow-x-auto whitespace-pre-wrap break-all"
            {...props}
          >
            {children}
          </pre>
        </div>
      );
    },

    // 인라인 코드 (`로 감싸진 코드)
    code: ({ children, className, ...props }: any) => {
      // pre 태그 안의 코드는 그대로 처리
      if (props.inline === false) {
        return (
          <code className={`${className || ""} text-sm font-mono`} {...props}>
            {children}
          </code>
        );
      }

      // 인라인 코드 스타일링
      return (
        <code
          className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono border"
          {...props}
        >
          {children}
        </code>
      );
    },

    // 헤딩
    h1: ({ children, ...props }: any) => (
      <h1
        className="text-2xl font-bold text-gray-900 mt-3 mb-4 pb-2 border-b border-gray-200"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-gray-800 mt-2 mb-3" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-medium text-gray-800 mt-1 mb-2" {...props}>
        {children}
      </h3>
    ),

    // 문단
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 leading-relaxed break-words" {...props}>
        {children}
      </p>
    ),

    // 리스트
    ul: ({ children, ...props }: any) => (
      <ul
        className="list-disc list-inside space-y-1 my-3 ml-4 text-gray-700"
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol
        className="list-decimal list-inside space-y-1 my-3 ml-4 text-gray-700"
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="break-words" {...props}>
        {children}
      </li>
    ),

    // 인용문
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-2 my-4 italic text-gray-700"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // 링크
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors duration-200"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    // 강조
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-900" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-800" {...props}>
        {children}
      </em>
    ),

    // 구분선
    hr: ({ ...props }: any) => (
      <hr className="border-gray-300 my-6" {...props} />
    ),

    // 테이블
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table
          className="min-w-full border border-gray-200 rounded-lg"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-gray-50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody className="divide-y divide-gray-200" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: any) => (
      <tr className="hover:bg-gray-50" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b border-gray-200"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2 text-sm text-gray-700 break-words" {...props}>
        {children}
      </td>
    ),
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;
