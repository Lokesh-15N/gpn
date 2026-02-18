import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faCalendarAlt, faUsers, faUserMd,
  faFileAlt, faClock, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { tokenAPI } from '../services/api';

const BookToken = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [formData, setFormData] = useState({
    departmentId: '',
    doctorId: '',
    visitReason: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: ''
  });

  // Mock departments - in production this would come from API
  useEffect(() => {
    setDepartments([
      { id: '1', name: 'Cardiology', avgWaitTime: 15 },
      { id: '2', name: 'Orthopedics', avgWaitTime: 20 },
      { id: '3', name: 'General Medicine', avgWaitTime: 10 },
      { id: '4', name: 'Pediatrics', avgWaitTime: 12 }
    ]);
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    if (formData.departmentId) {
      // Mock doctors - in production this would come from API
      setDoctors([
        { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Senior Cardiologist', available: true },
        { id: '2', name: 'Dr. Michael Chen', specialization: 'Cardiac Surgeon', available: true },
        { id: '3', name: 'Dr. Priya Kumar', specialization: 'Interventional Cardiologist', available: false }
      ]);
    } else {
      setDoctors([]);
      setFormData(prev => ({ ...prev, doctorId: '' }));
    }
  }, [formData.departmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledTime = `${formData.scheduledDate}T${formData.scheduledTime}:00.000Z`;

      const { data } = await tokenAPI.bookToken({
        departmentId: formData.departmentId,
        doctorId: formData.doctorId || null,
        visitReason: formData.visitReason,
        scheduledTime: scheduledTime
      });

      alert(`Token booked successfully!\nToken Number: ${data.data.tokenNumber}`);
      navigate(`/token/${data.data.tokenId}`);
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to book token';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
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
            Book New Appointment
          </h1>
          <p className="text-gray-600 mt-2">
            Fill in the details to schedule your OPD visit
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="card">
          {/* Department Selection */}
          <div className="mb-6">
            <label className="label">
              <FontAwesomeIcon icon={faUsers} className="mr-2 text-secondary" />
              Select Department *
            </label>
            <select
              className="input"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              required
            >
              <option value="">Choose a department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} (Avg wait: {dept.avgWaitTime} min)
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Selection */}
          {formData.departmentId && (
            <div className="mb-6">
              <label className="label">
                <FontAwesomeIcon icon={faUserMd} className="mr-2 text-secondary" />
                Select Doctor (Optional)
              </label>
              <select
                className="input"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
              >
                <option value="">Auto-assign available doctor</option>
                {doctors.map((doctor) => (
                  <option
                    key={doctor.id}
                    value={doctor.id}
                    disabled={!doctor.available}
                  >
                    {doctor.name} - {doctor.specialization}
                    {!doctor.available && ' (Not Available)'}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-1">
                Leave empty to auto-assign the best available doctor
              </p>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="label">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-secondary" />
                Appointment Date *
              </label>
              <input
                type="date"
                className="input"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="label">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-secondary" />
                Preferred Time *
              </label>
              <input
                type="time"
                className="input"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                OPD Hours: 9:00 AM - 5:00 PM
              </p>
            </div>
          </div>

          {/* Visit Reason */}
          <div className="mb-6">
            <label className="label">
              <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-secondary" />
              Reason for Visit *
            </label>
            <textarea
              className="input resize-none"
              rows="4"
              placeholder="Describe your symptoms or reason for consultation..."
              value={formData.visitReason}
              onChange={(e) => setFormData({ ...formData, visitReason: e.target.value })}
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-secondary/5 border-l-4 border-secondary rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-primary text-lg mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" />
              Important Information
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• You'll receive a token number after booking</li>
              <li>• Check-in requires you to be within 200m of the hospital</li>
              <li>• You'll get real-time updates on your queue position</li>
              <li>• Notifications will alert you 3 minutes before your turn</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookToken;
