import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faClock, faMapMarkerAlt, faSignOutAlt,
  faCalendarCheck, faUserMd, faHospital, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../store/authStore';
import { tokenAPI } from '../services/api';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'BOOKED': 'badge-info',
      'CHECKED_IN': 'badge-warning',
      'WAITING': 'badge-warning',
      'IN_CONSULTATION': 'badge-success',
      'COMPLETED': 'badge-success',
      'CANCELLED': 'badge-danger',
      'NO_SHOW': 'badge-danger'
    };
    return colors[status] || 'badge-info';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="nav-header">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">
                Patient Dashboard
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <FontAwesomeIcon icon={faUserMd} className="text-secondary" />
                Welcome, {user?.name}
              </p>
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
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/patient/book')}
            className="stat-card hover:border-secondary border-2 border-transparent group"
          >
            <div className="stat-icon bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Book New Token
            </h3>
            <p className="text-gray-600 text-sm">
              Schedule your OPD appointment
            </p>
          </button>

          <div className="stat-card">
            <div className="stat-icon bg-success/10 text-success">
              <FontAwesomeIcon icon={faCalendarCheck} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Active Tokens
            </h3>
            <p className="text-4xl font-bold text-primary">
              {tokens.filter(t => ['BOOKED', 'CHECKED_IN', 'WAITING'].includes(t.status)).length}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Total Visits
            </h3>
            <p className="text-4xl font-bold text-primary">
              {tokens.length}
            </p>
          </div>
        </div>

        {/* My Tokens */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-semibold text-primary flex items-center gap-3">
              <FontAwesomeIcon icon={faHospital} className="text-secondary" />
              My Appointments
            </h2>
          </div>

          {tokens.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                <FontAwesomeIcon icon={faClock} className="text-6xl text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg mb-6">No appointments found</p>
              <button
                onClick={() => navigate('/patient/book')}
                className="btn btn-secondary"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Book Your First Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token.tokenId}
                  className="border-2 border-gray-100 rounded-xl p-5 hover:border-secondary hover:shadow-lg transition-all cursor-pointer bg-white"
                  onClick={() => navigate(`/token/${token.tokenId}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl font-bold text-secondary">
                          #{token.tokenNumber}
                        </span>
                        <span className={`badge ${getStatusColor(token.status)}`}>
                          {token.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserMd} className="text-secondary" />
                        Dr. {token.doctorName}
                      </p>
                      <p className="text-gray-600 ml-6">
                        {token.departmentName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 text-sm mb-1">
                        <FontAwesomeIcon icon={faCalendarCheck} className="mr-2 text-secondary" />
                        {new Date(token.scheduledTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-primary font-bold text-xl">
                        {new Date(token.scheduledTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {token.estimatedWait && token.status === 'WAITING' && (
                        <div className="mt-2 bg-secondary/10 px-3 py-1 rounded-full">
                          <p className="text-secondary font-semibold text-sm">
                            <FontAwesomeIcon icon={faClock} className="mr-1" />
                            ~{token.estimatedWait} min wait
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-secondary/5 border-l-4 border-secondary rounded-xl p-6">
          <div className="flex items-start gap-4">
            <FontAwesomeIcon icon={faInfoCircle} className="text-2xl text-secondary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-primary text-lg mb-2">
                Check-in Instructions
              </h3>
              <p className="text-gray-700 leading-relaxed">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-secondary mr-2" />
                You must be within 200 meters of the hospital to check-in for your appointment.
                The app will automatically enable check-in when you arrive.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
