import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faCalendarAlt, faUsers, faUserMd,
  faFileAlt, faClock, faInfoCircle, faHospital, faClinicMedical
} from '@fortawesome/free-solid-svg-icons';
import { tokenAPI, departmentAPI, hospitalAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const BookToken = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Type, 2: Select Hospital/Clinic, 3: Book Appointment
  const [facilityType, setFacilityType] = useState(''); // 'HOSPITAL' or 'CLINIC'
  const [facilities, setFacilities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const [formData, setFormData] = useState({
    hospitalId: '',
    departmentId: '',
    doctorId: '',
    visitReason: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: ''
  });

  // Fetch facilities when type is selected
  useEffect(() => {
    const fetchFacilities = async () => {
      if (facilityType) {
        try {
          const { data } = await hospitalAPI.getAll({ type: facilityType });
          setFacilities(data.data);
        } catch (error) {
          console.error('Error fetching facilities:', error);
          alert('Failed to load facilities');
        }
      }
    };
    fetchFacilities();
  }, [facilityType]);

  // Fetch facility details when selected
  useEffect(() => {
    const fetchFacilityDetails = async () => {
      if (formData.hospitalId) {
        try {
          const { data } = await hospitalAPI.getById(formData.hospitalId);
          setSelectedFacility(data.data);

          if (data.data.type === 'HOSPITAL') {
            setDepartments(data.data.departments || []);
          } else {
            // For clinics, directly set the doctor
            setDoctors(data.data.doctors || []);
            if (data.data.doctors && data.data.doctors.length > 0) {
              setFormData(prev => ({ ...prev, doctorId: data.data.doctors[0].doctor_id }));
            }
          }
        } catch (error) {
          console.error('Error fetching facility details:', error);
          alert('Failed to load facility details');
        }
      }
    };
    fetchFacilityDetails();
  }, [formData.hospitalId]);

  // Load doctors when department changes (for hospitals)
  useEffect(() => {
    const fetchDoctors = async () => {
      if (formData.departmentId) {
        setLoadingDoctors(true);
        try {
          const { data } = await departmentAPI.getDoctorsByDepartment(formData.departmentId);
          setDoctors(data.data);
        } catch (error) {
          console.error('Error fetching doctors:', error);
          setDoctors([]);
        } finally {
          setLoadingDoctors(false);
        }
      } else {
        setDoctors([]);
        setFormData(prev => ({ ...prev, doctorId: '' }));
      }
    };
    if (facilityType === 'HOSPITAL') {
      fetchDoctors();
    }
  }, [formData.departmentId, facilityType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledTime = `${formData.scheduledDate}T${formData.scheduledTime}:00.000Z`;

      const { data } = await tokenAPI.requestToken({
        patientId: user.id,
        departmentId: formData.departmentId,
        doctorId: formData.doctorId || null,
        visitReason: formData.visitReason,
        scheduledDate: scheduledTime
      });

      alert(`Token booked successfully!\nToken Number: ${data.data.tokenNumber}`);
      navigate(`/token/${data.data.tokenId}`);
    } catch (error) {
      console.error('Booking error:', error);
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
          {/* Facility Type Selection */}
          <div className="mb-8">
            <label className="label text-lg font-semibold">
              Choose Facility Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setFacilityType('HOSPITAL');
                  setFormData({ ...formData, hospitalId: '', departmentId: '', doctorId: '' });
                }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  facilityType === 'HOSPITAL'
                    ? 'border-secondary bg-secondary/5 shadow-md'
                    : 'border-gray-200 hover:border-secondary/50'
                }`}
              >
                <FontAwesomeIcon icon={faHospital} className="text-4xl text-secondary mb-3" />
                <h3 className="font-semibold text-lg text-primary">Hospital</h3>
                <p className="text-sm text-gray-600 mt-1">Multiple departments & doctors</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFacilityType('CLINIC');
                  setFormData({ ...formData, hospitalId: '', departmentId: '', doctorId: '' });
                }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  facilityType === 'CLINIC'
                    ? 'border-secondary bg-secondary/5 shadow-md'
                    : 'border-gray-200 hover:border-secondary/50'
                }`}
              >
                <FontAwesomeIcon icon={faClinicMedical} className="text-4xl text-secondary mb-3" />
                <h3 className="font-semibold text-lg text-primary">Clinic</h3>
                <p className="text-sm text-gray-600 mt-1">Single doctor practice</p>
              </button>
            </div>
          </div>

          {/* Facility Selection */}
          {facilityType && (
            <div className="mb-6">
              <label className="label">
                <FontAwesomeIcon icon={facilityType === 'HOSPITAL' ? faHospital : faClinicMedical} className="mr-2 text-secondary" />
                Select {facilityType === 'HOSPITAL' ? 'Hospital' : 'Clinic'} *
              </label>
              <select
                className="input"
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value, departmentId: '', doctorId: '' })}
                required
              >
                <option value="">Choose a {facilityType.toLowerCase()}</option>
                {facilities.map((facility) => (
                  <option key={facility.hospital_id} value={facility.hospital_id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department Selection (only for hospitals) */}
          {facilityType === 'HOSPITAL' && formData.hospitalId && (
            <div className="mb-6">
              <label className="label">
                <FontAwesomeIcon icon={faUsers} className="mr-2 text-secondary" />
                Select Department *
              </label>
              <select
                className="input"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, doctorId: '' })}
                required
              >
                <option value="">Choose a department</option>
                {departments.map((dept) => (
                  <option key={dept.dept_id} value={dept.dept_id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Doctor Selection */}
          {((facilityType === 'HOSPITAL' && formData.departmentId) || (facilityType === 'CLINIC' && formData.hospitalId)) && (
            <div className="mb-6">
              <label className="label">
                <FontAwesomeIcon icon={faUserMd} className="mr-2 text-secondary" />
                {facilityType === 'CLINIC' ? 'Doctor' : 'Select Doctor (Optional)'}
              </label>
              <select
                className="input"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                disabled={loadingDoctors || (facilityType === 'CLINIC' && doctors.length === 1)}
                required={facilityType === 'CLINIC'}
              >
                <option value="">
                  {loadingDoctors ? 'Loading doctors...' : 'Auto-assign available doctor'}
                </option>
                {doctors.map((doctor) => (
                  <option
                    key={doctor.doctor_id}
                    value={doctor.doctor_id}
                  >
                    {doctor.name} - {doctor.specialization}
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
