import { Routes, Route, Navigate } from 'react-router-dom';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import TokenDetails from './pages/TokenDetails';
import BookToken from './pages/BookToken';
import { useAuthStore } from './store/authStore';

function App() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/patient"
          element={user?.role === 'PATIENT' ? <PatientDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/patient/book"
          element={user?.role === 'PATIENT' ? <BookToken /> : <Navigate to="/login" />}
        />
        <Route
          path="/token/:tokenId"
          element={user ? <TokenDetails /> : <Navigate to="/login" />}
        />

        <Route
          path="/doctor"
          element={user?.role === 'DOCTOR' ? <DoctorDashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/admin"
          element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
