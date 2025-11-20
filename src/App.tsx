import Main from "./pages/Main";
import TestMain from "./test/TestMain";

function App() {
  // VITE_TEST_MODE 환경변수로 테스트 모드 활성화
  const isTestMode = import.meta.env.VITE_TEST_MODE === "true";

  return <div className="App">{isTestMode ? <TestMain /> : <Main />}</div>;
}

export default App;
