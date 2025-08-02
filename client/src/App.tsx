import Layout from "./components/Layout";
import Main from "./pages/Main";

function App() {
  return (
    <div className="App">
      <Layout showSidebar={true}>
        <Main />
      </Layout>
    </div>
  );
}

export default App;
