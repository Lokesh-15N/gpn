import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt, faClock, faUsers, faPlay, faCheckCircle,
  faTimesCircle, faCoffee, faUserMd, faHospital
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../store/authStore';
import { doctorAPI } from '../services/api';
import websocketService from '../services/websocket';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [currentToken, setCurrentToken] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({
    currentPosition: 0,
    totalInQueue: 0,
    completedToday: 0,
    avgConsultationTime: 0
  });
  const [doctorStatus, setDoctorStatus] = useState('AVAILABLE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQueue();

    // Subscribe to WebSocket updates
    websocketService.connect();
    websocketService.subscribe('doctor', user?.id);

    websocketService.on('doctor:queue_updated', (data) => {
      setQueue(data.queue);
      setStats(data.stats);
    });

    const interval = setInterval(loadQueue, 30000); // Refresh every 30s
    return () => {
      clearInterval(interval);
      websocketService.unsubscribe('doctor', user?.id);
    };
  }, [user?.id]);

  const loadQueue = async () => {
    try {
      const { data } = await doctorAPI.getQueue(user?.id);
      setQueue(data.data.queue);
      setStats(data.data.stats);
      setCurrentToken(data.data.currentConsultation);
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };

  const handleStartConsultation = async (tokenId) => {
    setLoading(true);
    try {
      const { data } = await doctorAPI.startConsultation(tokenId);
      setCurrentToken(data.data);
      await loadQueue();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to start consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentToken) return;

    setLoading(true);
    try {
      const { data } = await doctorAPI.completeConsultation(currentToken.id);
      setCurrentToken(null);

      if (data.data.nextToken) {
        // Automatically start next consultation
        setCurrentToken(data.data.nextToken);
      }

      await loadQueue();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to complete consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async (tokenId) => {
    if (!confirm('Mark this patient as No-Show?')) return;

    setLoading(true);
    try {
      await doctorAPI.markNoShow(tokenId);
      await loadQueue();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to mark no-show');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await doctorAPI.updateStatus(user?.id, newStatus);
      setDoctorStatus(newStatus);
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="nav-header">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <FontAwesomeIcon icon={faUserMd} className="text-secondary" />
                Doctor Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Dr. {user?.name}</p>
            </div>
            <div className="flex gap-3">
              {/* Status Toggle */}
              <select
                value={doctorStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="AVAILABLE">✓ Available</option>
                <option value="ON_LEAVE">🏥 On Leave</option>
                <option value="BREAK">☕ On Break</option>
              </select>

              <button
                onClick={handleLogout}
                className="btn btn-outline flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 text-white p-3 rounded-full">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Queue</p>
                <p className="text-2xl font-bold">{stats.totalInQueue}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 text-white p-3 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 text-white p-3 rounded-full">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold">{stats.avgConsultationTime}m</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                doctorStatus === 'AVAILABLE' ? 'bg-green-500' :
                doctorStatus === 'BREAK' ? 'bg-yellow-500' : 'bg-red-500'
              } text-white`}>
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold">{doctorStatus.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Consultation */}
        {currentToken && (
          <div className="card mb-8 bg-gradient-to-r from-green-500 to-teal-600 text-white">
            <h2 className="text-xl font-semibold mb-4">Current Consultation</h2>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm opacity-90">Token Number</p>
                  <p className="text-3xl font-bold">{currentToken.tokenNumber}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Patient</p>
                  <p className="text-xl font-semibold">{currentToken.patientName}</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Started At</p>
                  <p className="font-medium">
                    {new Date(currentToken.startedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Visit Reason</p>
                  <p className="font-medium">{currentToken.visitReason}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteConsultation}
              disabled={loading}
              className="btn w-full bg-white text-green-600 hover:bg-gray-100"
            >
              <CheckCircle className="w-5 h-5 inline mr-2" />
              {loading ? 'Completing...' : 'Complete Consultation'}
            </button>
          </div>
        )}

        {/* Queue */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Upcoming Queue</h2>

          {queue.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No patients in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((token, index) => (
                <div
                  key={token.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                          {index + 1}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-bold text-primary">
                            {token.tokenNumber}
                          </span>
                          <span className={`badge ${
                            token.status === 'CHECKED_IN' ? 'badge-success' : 'badge-info'
                          }`}>
                            {token.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {token.patientName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {token.visitReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!currentToken && index === 0 && (
                        <button
                          onClick={() => handleStartConsultation(token.id)}
                          disabled={loading}
                          className="btn btn-success"
                        >
                          <Play className="w-4 h-4 inline mr-1" />
                          Start
                        </button>
                      )}

                      <button
                        onClick={() => handleNoShow(token.id)}
                        disabled={loading}
                        className="btn btn-danger"
                      >
                        <XCircle className="w-4 h-4 inline mr-1" />
                        No Show
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
