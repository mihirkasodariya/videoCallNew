import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateRoom() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    // Generate a random room ID if not provided
    const newRoomId = roomId.trim() || Math.random().toString(36).substring(2, 9).toUpperCase();
    navigate(`/room/${newRoomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Video Room</h1>
        <p className="text-gray-600 mb-6">Set up a new meeting room</p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room ID (optional - leave empty for random)
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter custom Room ID"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          onClick={handleCreateRoom}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Create Room
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition-all duration-200"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default CreateRoom;

