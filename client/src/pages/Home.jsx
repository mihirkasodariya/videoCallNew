import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex flex-col">
      {/* Header */}
      <header className="text-center py-12 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          TalkRandom
        </h1>
        <p className="text-xl md:text-2xl text-white/90 font-light">
          Instant video conversations. Random or in rooms.
        </p>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8">
          {/* Card 1: One-to-One Random Video Chat */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <div className="flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                One-to-One Random Video Chat
              </h2>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Instantly connect with a random person</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Camera & mic ON for both users</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Private 1-to-1 conversation</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/random')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              👉 Start Random Chat
            </button>
          </div>

          {/* Card 2: Video Room (Meeting Mode) */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <div className="flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Video Room (Meeting Mode)
              </h2>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Create or join a video room</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Host camera & mic ON</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Participants join muted</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Text chat only for participants</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/create-room')}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Create Room
              </button>
              <button
                onClick={() => setShowJoinInput(!showJoinInput)}
                className="w-full bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Join Room
              </button>
              {showJoinInput && (
                <form onSubmit={handleJoinRoom} className="mt-3 animate-fadeIn">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Enter Room ID"
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Join
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Room Rules Info Box */}
      <div className="px-4 pb-8 max-w-6xl w-full mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Meeting Mode Rules
          </h3>
          <ul className="space-y-2 text-white/90">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Host</strong> must have camera & mic ON</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Participants</strong> join muted (camera OFF, mic OFF)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Participants</strong> cannot share video/audio</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Text chat only</strong> for participants</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;

