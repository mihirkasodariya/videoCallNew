import { useParams, useNavigate } from 'react-router-dom';

function VideoRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Video Room</h1>
              <p className="text-gray-600">Room ID: <span className="font-mono font-semibold text-blue-600">{roomId}</span></p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </button>
          </div>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-blue-800">
              <strong>Note:</strong> Video Room functionality will be implemented here. 
              This is a placeholder page for room: <span className="font-mono">{roomId}</span>
            </p>
          </div>

          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Meeting Room</h2>
            <p className="text-gray-600">WebRTC implementation coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoRoom;

