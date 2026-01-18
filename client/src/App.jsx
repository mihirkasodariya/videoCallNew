import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RandomChat from './pages/RandomChat';
import CreateRoom from './pages/CreateRoom';
import VideoRoom from './pages/VideoRoom';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/random" element={<RandomChat />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<VideoRoom />} />
      </Routes>
    </Router>
  );
}

export default App;

