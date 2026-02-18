import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt, faChartLine, faUsers, faClock,
  faArrowTrendUp, faExclamationTriangle, faHospital, faUserMd
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../store/authStore';
import { adminAPI } from '../services/api';
import websocketService from '../services/websocket';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [overview, setOverview] = useState({
    totalTokensToday: 0,
    activeTokens: 0,
    completedToday: 0,
    avgWaitTime: 0,
    activeDoctors: 0,
    departments: []
  });
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    // Subscribe to WebSocket updates
    websocketService.connect();
    websocketService.subscribe('admin', 'dashboard');

    websocketService.on('admin:metrics_updated', (data) => {
      setOverview(prev => ({ ...prev, ...data }));
    });

    const interval = setInterval(loadDashboard, 60000); // Refresh every minute
    return () => {
      clearInterval(interval);
      websocketService.unsubscribe('admin', 'dashboard');
    };
  }, []);

  const loadDashboard = async () => {
    try {
      const [overviewRes, heatmapRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getHeatmap()
      ]);

      setOverview(overviewRes.data.data);
      setHeatmap(heatmapRes.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getHeatColor = (level) => {
    const colors = {
      'GREEN': 'bg-green-500',
      'YELLOW': 'bg-yellow-500',
      'ORANGE': 'bg-orange-500',
      'RED': 'bg-red-500'
    };
    return colors[level] || 'bg-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="nav-header">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <FontAwesomeIcon icon={faHospital} className="text-secondary" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Real-time OPD Analytics</p>
            </div>
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

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="stat-card">
            <div className="stat-icon bg-secondary/10 text-secondary">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Today</p>
            <p className="text-3xl font-bold text-primary">{overview.totalTokensToday}</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-warning/10 text-warning">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Active Now</p>
            <p className="text-3xl font-bold text-primary">{overview.activeTokens}</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-success/10 text-success">
              <FontAwesomeIcon icon={faArrowTrendUp} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-primary">{overview.completedToday}</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Wait</p>
            <p className="text-3xl font-bold text-primary">{overview.avgWaitTime}m</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-indigo-500/10 text-indigo-600">
              <FontAwesomeIcon icon={faUserMd} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Doctors Active</p>
            <p className="text-3xl font-bold text-primary">{overview.activeDoctors}</p>
          </div>
        </div>

        {/* Department Performance */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-6">Department Performance</h2>

          <div className="space-y-4">
            {overview.departments.map((dept) => (
              <div key={dept.departmentId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{dept.departmentName}</h3>
                    <p className="text-sm text-gray-600">
                      {dept.activeDoctors} doctors • {dept.activeTokens} active patients
                    </p>
                  </div>
                  {dept.isBottleneck && (
                    <span className="badge badge-danger flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Bottleneck
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Queue Size</p>
                    <p className="text-xl font-bold">{dept.queueSize}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Wait</p>
                    <p className="text-xl font-bold">{dept.avgWaitTime}m</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-xl font-bold">{dept.completedToday}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Utilization</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            dept.utilizationRate > 80 ? 'bg-red-500' :
                            dept.utilizationRate > 60 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${dept.utilizationRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">
                        {dept.utilizationRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Hourly Load Heatmap</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Time Slot
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                    Tokens
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                    Avg Wait
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                    Load Level
                  </th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map((slot) => (
                  <tr key={slot.hour} className="border-t">
                    <td className="px-4 py-3 text-sm font-medium">
                      {slot.hour}:00 - {slot.hour + 1}:00
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {slot.tokensBooked}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {slot.avgWaitTime} min
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-16 h-4 rounded ${getHeatColor(slot.heatLevel)}`} />
                        <span className="text-xs font-semibold">
                          {slot.heatLevel}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Normal (0-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span>Moderate (6-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span>High (11-15)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Critical (16+)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
