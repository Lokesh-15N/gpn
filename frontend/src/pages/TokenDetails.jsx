import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faMapMarkerAlt, faClock, faUser,
  faFileAlt, faCheckCircle, faMapMarkedAlt
} from '@fortawesome/free-solid-svg-icons';
import { tokenAPI } from '../services/api';
import websocketService from '../services/websocket';

const TokenDetails = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadTokenDetails();

    // Subscribe to WebSocket updates
    websocketService.connect();
    websocketService.subscribe('token', tokenId);

    websocketService.on('token:position_updated', (data) => {
      setToken(prev => ({
        ...prev,
        queuePosition: data.queuePosition,
        estimatedWaitTime: data.estimatedWaitTime
      }));
    });

    websocketService.on('token:tminus3', (data) => {
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('OPD Alert', {
          body: data.message,
          icon: '/hospital-icon.png'
        });
      }
    });

    websocketService.on('token:call_alert', (data) => {
      // Show urgent notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Your Turn!', {
          body: data.message,
          icon: '/hospital-icon.png',
          requireInteraction: true
        });
      }
    });

    return () => {
      websocketService.unsubscribe('token', tokenId);
    };
  }, [tokenId]);

  const loadTokenDetails = async () => {
    try {
      const { data } = await tokenAPI.getToken(tokenId);
      setToken(data.data);
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setCheckingIn(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { data } = await tokenAPI.checkIn(tokenId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });

          setToken(prev => ({
            ...prev,
            status: 'CHECKED_IN',
            ...data.data
          }));

          alert(data.data.message);
        } catch (error) {
          const errorMsg = error.response?.data?.error?.message || 'Check-in failed';
          alert(errorMsg);
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services.');
        setCheckingIn(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading token details...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Token not found</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'BOOKED': 'bg-blue-100 text-blue-800',
      'CHECKED_IN': 'bg-yellow-100 text-yellow-800',
      'WAITING': 'bg-yellow-100 text-yellow-800',
      'IN_CONSULTATION': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="nav-header">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-secondary hover:text-primary mb-4 font-medium"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </button>
          <h1 className="text-3xl font-bold text-primary">
            Token Details
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Token Number Card */}
        <div className="card mb-6 text-center bg-gradient-to-br from-primary to-secondary text-white">
          <div className="text-7xl font-bold mb-3">
            #{token.tokenNumber}
          </div>
          <div className={`inline-block px-5 py-2 rounded-full text-sm font-semibold ${getStatusColor(token.status)}`}>
            {token.status.replace('_', ' ')}
          </div>
        </div>

        {/* Queue Status */}
        {(token.status === 'WAITING' || token.status === 'CHECKED_IN') && (
          <div className="card mb-6 bg-gradient-to-r from-primary to-secondary text-white">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">Your Position in Queue</p>
              <p className="text-6xl font-bold mb-4">{token.queuePosition}</p>
              <p className="text-sm opacity-90">Estimated Wait Time</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <FontAwesomeIcon icon={faClock} className="text-2xl" />
                <p className="text-4xl font-semibold">
                  ~{token.estimatedWaitTime} min
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Check-In Button */}
        {token.status === 'BOOKED' && (
          <div className="card mb-6 bg-secondary/5 border-l-4 border-secondary">
            <div className="flex items-center gap-4 mb-4">
              <FontAwesomeIcon icon={faMapMarkedAlt} className="text-3xl text-secondary" />
              <div>
                <h3 className="font-semibold text-primary text-lg">Check-In Required</h3>
                <p className="text-sm text-gray-600">
                  You must be within 200m of the hospital to check-in
                </p>
              </div>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="btn btn-primary w-full"
            >
              {checkingIn ? 'Checking Location...' : 'Check-In Now'}
            </button>
          </div>
        )}

        {/* Appointment Details */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-primary mb-5 card-header">Appointment Details</h2>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="stat-icon bg-secondary/10 text-secondary">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Doctor</p>
                <p className="font-semibold text-lg">{token.doctor.name}</p>
                <p className="text-sm text-gray-500">{token.doctor.specialization}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="stat-icon bg-primary/10 text-primary">
                <FontAwesomeIcon icon={faFileAlt} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Department</p>
                <p className="font-semibold text-lg">{token.department.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="stat-icon bg-success/10 text-success">
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Scheduled Time</p>
                <p className="font-semibold text-lg">
                  {new Date(token.timeline.booked).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Status Timeline</h2>

          <div className="space-y-3">
            {token.timeline.booked && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-medium">Token Booked</p>
                  <p className="text-sm text-gray-600">
                    {new Date(token.timeline.booked).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {token.timeline.checkedIn && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-medium">Checked In</p>
                  <p className="text-sm text-gray-600">
                    {new Date(token.timeline.checkedIn).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {!token.timeline.checkedIn && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div>
                  <p className="font-medium text-gray-400">Waiting to Check-In</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetails;
