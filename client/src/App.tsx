import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import CraftPage from './pages/CraftPage'
import ChatPage from './pages/ChatPage'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route 
          path="/craft" 
          element={
            <Layout showSidebar={true}>
              <CraftPage />
            </Layout>
          } 
        />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  )
}

export default App