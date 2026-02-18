import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospital, faUser, faUserMd, faPhone, faLock, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [userType, setUserType] = useState('patient'); // 'patient' or 'doctor'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [patientData, setPatientData] = useState({
    phone: '',
    name: '',
    hospitalId: '123e4567-e89b-12d3-a456-426614174000' // Default hospital ID
  });

  const [doctorData, setDoctorData] = useState({
    empCode: '',
    password: '',
    hospitalId: '123e4567-e89b-12d3-a456-426614174000'
  });

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await authAPI.patientRegister(patientData);

      setAuth(
        {
          id: data.data.patientId,
          role: 'PATIENT',
          name: patientData.name
        },
        data.data.accessToken,
        data.data.refreshToken
      );

      navigate('/patient');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await authAPI.doctorLogin(doctorData);

      setAuth(
        {
          id: data.data.doctorId,
          role: 'DOCTOR',
          name: data.data.name
        },
        data.data.accessToken,
        data.data.refreshToken
      );

      navigate('/doctor');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-secondary p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <FontAwesomeIcon icon={faHospital} className="text-6xl text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            PulseFlow
          </h1>
          <p className="text-white/80 text-lg font-light">
            Dynamic OPD Orchestration System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Toggle User Type */}
          <div className="flex bg-gray-50">
            <button
              onClick={() => setUserType('patient')}
              className={`flex-1 py-4 font-semibold transition-all ${
                userType === 'patient'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={faUser} className="mr-2" />
              Patient
            </button>
            <button
              onClick={() => setUserType('doctor')}
              className={`flex-1 py-4 font-semibold transition-all ${
                userType === 'doctor'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={faUserMd} className="mr-2" />
              Doctor
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-accent/10 border-l-4 border-accent text-accent px-4 py-3 rounded mb-6">
                <div className="flex items-center">
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Patient Login Form */}
            {userType === 'patient' && (
              <form onSubmit={handlePatientLogin} className="space-y-5">
                <div>
                  <label className="label">
                    <FontAwesomeIcon icon={faPhone} className="mr-2 text-secondary" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+91 9876543210"
                    value={patientData.phone}
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <FontAwesomeIcon icon={faUser} className="mr-2 text-secondary" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter your name"
                    value={patientData.name}
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full mt-6"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⏳</span>
                      Logging in...
                    </>
                  ) : (
                    'Login / Register'
                  )}
                </button>
              </form>
            )}

            {/* Doctor Login Form */}
            {userType === 'doctor' && (
              <form onSubmit={handleDoctorLogin} className="space-y-5">
                <div>
                  <label className="label">
                    <FontAwesomeIcon icon={faIdCard} className="mr-2 text-secondary" />
                    Employee Code
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="DOC1024"
                    value={doctorData.empCode}
                    onChange={(e) => setDoctorData({ ...doctorData, empCode: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <FontAwesomeIcon icon={faLock} className="mr-2 text-secondary" />
                    Password
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your password"
                    value={doctorData.password}
                    onChange={(e) => setDoctorData({ ...doctorData, password: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full mt-6"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⏳</span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-white/90 font-medium mb-2">Demo Credentials</p>
          <p className="text-white/70 text-sm">Doctor: <span className="font-mono">DOC1024</span> / <span className="font-mono">password123</span></p>
          <p className="text-white/70 text-sm">Patient: Any phone number</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
