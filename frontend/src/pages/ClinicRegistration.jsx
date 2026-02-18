import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClinicMedical, faUser, faEnvelope, faLock, faPhone,
  faMapMarkerAlt, faClock, faStethoscope, faIdCard, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { hospitalAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const ClinicRegistration = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clinicName: '',
    address: '',
    doctorName: '',
    doctorPhone: '',
    doctorEmail: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    registrationNumber: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data } = await hospitalAPI.registerClinic({
        clinicName: formData.clinicName,
        address: formData.address,
        doctorName: formData.doctorName,
        doctorPhone: formData.doctorPhone,
        doctorEmail: formData.doctorEmail,
        password: formData.password,
        specialization: formData.specialization,
        registrationNumber: formData.registrationNumber
      });

      // Set auth tokens
      setAuth(
        data.data.doctor,
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );

      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);

      alert(`Clinic registered successfully!\nFree Tier: ${data.data.clinic.monthly_booking_limit} bookings/month`);
      navigate('/doctor/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.response?.data?.error?.message || 'Failed to register clinic';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-white hover:text-secondary mb-4 font-medium"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Login
          </button>
          <FontAwesomeIcon icon={faClinicMedical} className="text-6xl text-white mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">
            Register Your Clinic
          </h1>
          <p className="text-white/90">
            Start with 50 free patient bookings per month
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinic Information */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-gray-200">
                Clinic Information
              </h2>
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <FontAwesomeIcon icon={faClinicMedical} className="mr-2 text-secondary" />
                Clinic Name *
              </label>
              <input
                type="text"
                name="clinicName"
                className="input"
                placeholder="e.g., Dr. Smith's Clinic"
                value={formData.clinicName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-secondary" />
                Clinic Address *
              </label>
              <textarea
                name="address"
                className="input resize-none"
                rows="2"
                placeholder="Full address with city and pincode"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Doctor Information */}
            <div className="md:col-span-2 mt-4">
              <h2 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-gray-200">
                Doctor Information
              </h2>
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faUser} className="mr-2 text-secondary" />
                Full Name *
              </label>
              <input
                type="text"
                name="doctorName"
                className="input"
                placeholder="Dr. John Smith"
                value={formData.doctorName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-secondary" />
                Specialization *
              </label>
              <input
                type="text"
                name="specialization"
                className="input"
                placeholder="e.g., General Physician"
                value={formData.specialization}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faPhone} className="mr-2 text-secondary" />
                Phone Number *
              </label>
              <input
                type="tel"
                name="doctorPhone"
                className="input"
                placeholder="10-digit mobile number"
                value={formData.doctorPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faIdCard} className="mr-2 text-secondary" />
                Medical Registration No.
              </label>
              <input
                type="text"
                name="registrationNumber"
                className="input"
                placeholder="MCI Registration Number"
                value={formData.registrationNumber}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-secondary" />
                Email Address *
              </label>
              <input
                type="email"
                name="doctorEmail"
                className="input"
                placeholder="doctor@example.com"
                value={formData.doctorEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faLock} className="mr-2 text-secondary" />
                Password *
              </label>
              <input
                type="password"
                name="password"
                className="input"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                minLength="6"
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faLock} className="mr-2 text-secondary" />
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                className="input"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Free Tier Benefits */}
          <div className="bg-secondary/5 border-l-4 border-secondary rounded-xl p-6 mt-6">
            <h3 className="font-semibold text-primary text-lg mb-3">
              Free Tier Benefits
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ 50 patient bookings per month at no cost</li>
              <li>✓ Online appointment scheduling system</li>
              <li>✓ Real-time queue management</li>
              <li>✓ Patient notifications and reminders</li>
              <li>✓ Digital token system</li>
              <li className="text-secondary font-medium">
                Upgrade to paid plan for unlimited bookings
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-6 text-lg py-4"
          >
            {loading ? 'Registering...' : 'Register Clinic'}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-secondary font-semibold hover:underline"
            >
              Login here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ClinicRegistration;
