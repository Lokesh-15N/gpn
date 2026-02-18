# Frontend - OPD Orchestration System

React 18 + Vite frontend with Tailwind CSS for the Dynamic Autonomous OPD Orchestration System.

## 🚀 Quick Start

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Backend API running on http://localhost:5000

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the frontend root directory if you need to customize API endpoint:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000
```

By default, the app uses the proxy configured in `vite.config.js`.

## 📁 Project Structure

```
frontend/
├── public/
│   └── (static assets)
│
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx           # Patient/Doctor login
│   │   ├── PatientDashboard.jsx    # Patient appointments view
│   │   ├── BookToken.jsx           # Book new appointment
│   │   ├── TokenDetails.jsx        # Real-time token tracking
│   │   ├── DoctorDashboard.jsx     # Doctor queue management
│   │   └── AdminDashboard.jsx      # Admin analytics
│   │
│   ├── services/
│   │   ├── api.js                  # Axios API client
│   │   └── websocket.js            # Socket.io client wrapper
│   │
│   ├── store/
│   │   └── authStore.js            # Zustand auth state
│   │
│   ├── App.jsx                     # Main app with routing
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Tailwind + custom styles
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎨 Styling

This project uses **Tailwind CSS 3** with custom utility classes defined in `index.css`.

### Custom Components

```css
/* Button variants */
.btn              /* Base button */
.btn-primary      /* Primary blue button */
.btn-secondary    /* Secondary gray button */
.btn-success      /* Green success button */
.btn-danger       /* Red danger button */

/* Card */
.card             /* White card with shadow */

/* Input */
.input            /* Styled input field */

/* Badge variants */
.badge            /* Base badge */
.badge-primary    /* Blue badge */
.badge-success    /* Green badge */
.badge-danger     /* Red badge */
.badge-warning    /* Yellow badge */
.badge-info       /* Light blue badge */
```

### Custom Colors

```javascript
// tailwind.config.js
colors: {
  primary: '#3B82F6',      // Blue
  secondary: '#6B7280',    // Gray
  success: '#10B981',      // Green
  danger: '#EF4444',       // Red
  warning: '#F59E0B',      // Yellow
  info: '#06B6D4',         // Cyan
}
```

## 📱 Features

### Patient Flow
1. **Login/Register** ([LoginPage.jsx](src/pages/LoginPage.jsx))
   - Phone-based registration
   - Auto-generates UHID
   - JWT token authentication

2. **Dashboard** ([PatientDashboard.jsx](src/pages/PatientDashboard.jsx))
   - View all appointments
   - Active token count
   - Quick book button

3. **Book Appointment** ([BookToken.jsx](src/pages/BookToken.jsx))
   - Department selection
   - Doctor selection (optional auto-assign)
   - Date/time picker
   - Visit reason input

4. **Track Token** ([TokenDetails.jsx](src/pages/TokenDetails.jsx))
   - Real-time queue position
   - Dynamic ETA countdown
   - Geo-fenced check-in button
   - WebSocket live updates
   - Browser notifications (T-3, call alerts)

### Doctor Flow
1. **Login** ([LoginPage.jsx](src/pages/LoginPage.jsx))
   - Employee code + password
   - JWT authentication

2. **Dashboard** ([DoctorDashboard.jsx](src/pages/DoctorDashboard.jsx))
   - Current consultation panel
   - Upcoming queue list
   - Start/Complete consultation buttons
   - Mark no-show
   - Update status (Available/On Leave/Break)
   - Real-time queue updates via WebSocket

### Admin Flow
1. **Dashboard** ([AdminDashboard.jsx](src/pages/AdminDashboard.jsx))
   - Key metrics (total, active, completed, avg wait)
   - Department performance cards
   - Bottleneck detection
   - Hourly heatmap (color-coded: Green/Yellow/Orange/Red)
   - Real-time metrics via WebSocket

## 🔌 API Integration

### Axios Instance

All API calls use the configured Axios instance from [src/services/api.js](src/services/api.js):

```javascript
import { authAPI, tokenAPI, doctorAPI, adminAPI } from './services/api';

// Example: Book token
const response = await tokenAPI.bookToken({
  departmentId: 'dept-id',
  doctorId: 'doctor-id',
  visitReason: 'Consultation',
  scheduledTime: '2024-01-15T10:00:00Z'
});
```

### API Functions

**Authentication**
- `authAPI.patientRegister(data)`
- `authAPI.doctorLogin(data)`
- `authAPI.refreshToken(refreshToken)`

**Tokens**
- `tokenAPI.bookToken(data)`
- `tokenAPI.getToken(tokenId)`
- `tokenAPI.checkIn(tokenId, { latitude, longitude })`
- `tokenAPI.cancelToken(tokenId)`

**Doctors**
- `doctorAPI.getQueue(doctorId)`
- `doctorAPI.startConsultation(tokenId)`
- `doctorAPI.completeConsultation(consultationId)`
- `doctorAPI.markNoShow(tokenId)`
- `doctorAPI.updateStatus(doctorId, status)`

**Admin**
- `adminAPI.getDashboard()`
- `adminAPI.getHeatmap(date)`

### Request Interceptors

Automatically adds JWT token to all requests:

```javascript
config.headers.Authorization = `Bearer ${accessToken}`;
```

### Response Interceptors

Automatically handles token refresh on 401:

```javascript
// If access token expired, refresh it and retry request
if (error.response?.status === 401) {
  const newToken = await refreshAccessToken();
  originalRequest.headers.Authorization = `Bearer ${newToken}`;
  return axios(originalRequest);
}
```

## 🔌 WebSocket Integration

### Connection

```javascript
import websocketService from './services/websocket';

// Connect
websocketService.connect();

// Subscribe to updates
websocketService.subscribe('token', tokenId);

// Listen to events
websocketService.on('token:position_updated', (data) => {
  console.log('New position:', data.queuePosition);
});

// Unsubscribe
websocketService.unsubscribe('token', tokenId);

// Disconnect
websocketService.disconnect();
```

### Events

**Token Updates**
- `token:position_updated` - Queue position changed
- `token:tminus3` - 3 minutes before consultation
- `token:call_alert` - Doctor calling patient

**Doctor Updates**
- `doctor:queue_updated` - Queue refreshed

**Admin Updates**
- `admin:metrics_updated` - Dashboard metrics updated

## 🔐 Authentication

### Zustand Store

Authentication state is managed with Zustand and persisted to localStorage:

```javascript
import { useAuthStore } from './store/authStore';

function MyComponent() {
  const { user, accessToken, setAuth, logout } = useAuthStore();

  // Check if logged in
  if (!user) return <LoginPage />;

  // Logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
}
```

### Protected Routes

Routes are protected based on user role in [App.jsx](src/App.jsx):

```javascript
// Patient routes
<Route path="/patient" element={user?.role === 'PATIENT' ? <PatientDashboard /> : <Navigate to="/" />} />

// Doctor routes
<Route path="/doctor" element={user?.role === 'DOCTOR' ? <DoctorDashboard /> : <Navigate to="/" />} />

// Admin routes
<Route path="/admin" element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />} />
```

## 📍 Geolocation

### Check-in with Geo-fencing

[TokenDetails.jsx](src/pages/TokenDetails.jsx) implements geo-fenced check-in:

```javascript
const handleCheckIn = async () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await tokenAPI.checkIn(tokenId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      // Server validates if within 200m of hospital
    },
    (error) => {
      alert('Unable to get your location');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};
```

### Browser Permissions

Request geolocation permission on first use. User must grant permission in browser settings.

## 🔔 Browser Notifications

### Push Notifications

[TokenDetails.jsx](src/pages/TokenDetails.jsx) shows browser notifications:

```javascript
// Request permission
if ('Notification' in window && Notification.permission === 'default') {
  await Notification.requestPermission();
}

// Show notification
if (Notification.permission === 'granted') {
  new Notification('Your Turn!', {
    body: 'Please proceed to consultation room',
    icon: '/hospital-icon.png',
    requireInteraction: true
  });
}
```

## 🧪 Testing

### Run Tests

```powershell
# Unit tests (if configured)
npm test

# E2E tests (if configured)
npm run test:e2e
```

### Manual Testing

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Test patient flow:
   - Register with phone
   - Book appointment
   - View token details
5. Test doctor flow:
   - Login with DOC1024 / password123
   - View queue
   - Start/complete consultations

## 🏗️ Building for Production

```powershell
# Build optimized production bundle
npm run build

# Output in dist/ directory
# Files are minified and optimized

# Preview production build locally
npm run preview
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── (other chunks)
└── (static assets)
```

## 🚀 Deployment

### Static Hosting (Netlify, Vercel)

```powershell
# Build
npm run build

# Deploy dist/ folder
# Configure:
# - Build command: npm run build
# - Publish directory: dist
# - Environment variables: VITE_API_BASE_URL
```

### Nginx

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/opd-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /socket.io {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Docker

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Customization

### Change Theme Colors

Edit [tailwind.config.js](tailwind.config.js):

```javascript
theme: {
  extend: {
    colors: {
      primary: '#YOUR_COLOR',
      secondary: '#YOUR_COLOR',
      // ...
    }
  }
}
```

### Change API Endpoint

Edit [vite.config.js](vite.config.js):

```javascript
proxy: {
  '/api': {
    target: 'http://your-backend-url:5000',
    changeOrigin: true,
  }
}
```

Or set environment variable:

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

### Add New Route

1. Create page component in `src/pages/`
2. Add route in [src/App.jsx](src/App.jsx):

```javascript
<Route path="/new-page" element={<NewPage />} />
```

## 🐛 Common Issues

### API calls return 404
**Problem**: Backend not running or wrong proxy config
**Solution**: Start backend on port 5000 or update proxy in `vite.config.js`

### WebSocket disconnects immediately
**Problem**: CORS or backend not configured
**Solution**: Check backend CORS_ORIGIN includes `http://localhost:5173`

### Geolocation not working
**Problem**: HTTPS required or permission denied
**Solution**: Use HTTPS in production, request permission properly

### Notifications not showing
**Problem**: Permission not granted
**Solution**: Call `Notification.requestPermission()` and check browser settings

### State not persisting after refresh
**Problem**: Zustand persist not working
**Solution**: Check browser localStorage is enabled

## 📚 Dependencies

### Core
- `react` - UI library
- `react-dom` - React DOM renderer
- `react-router-dom` - Routing

### State & Data
- `zustand` - State management
- `@tanstack/react-query` - Server state management
- `axios` - HTTP client
- `socket.io-client` - WebSocket client

### UI
- `tailwindcss` - Utility-first CSS
- `lucide-react` - Icon library
- `autoprefixer` - CSS vendor prefixes

### Dev Tools
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin for Vite
- `postcss` - CSS processing

## 🤝 Contributing

1. Follow React best practices
2. Use functional components with hooks
3. Keep components small and reusable
4. Add PropTypes or TypeScript types
5. Update documentation for new features

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For issues:
- Check browser console for errors
- Verify backend is running
- Check network tab for failed requests
- Review API documentation in backend README
