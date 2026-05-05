import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GameManage from './pages/GameManage'
import JoinGame from './pages/JoinGame'
import Stats from './pages/Stats'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:id" element={<GameManage />} />
        <Route path="/game/:id/join" element={<JoinGame />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  )
}
