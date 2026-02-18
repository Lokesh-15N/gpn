import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Hospital = sequelize.define('Hospital', {
  hospital_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  geofence_radius: {
    type: DataTypes.INTEGER,
    defaultValue: 200
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Kolkata'
  },
  operating_hours: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '20:00' },
      saturday: { open: '08:00', close: '14:00' },
      sunday: { open: 'closed', close: 'closed' }
    }
  },
  type: {
    type: DataTypes.ENUM('HOSPITAL', 'CLINIC'),
    defaultValue: 'HOSPITAL',
    allowNull: false
  },
  subscription_tier: {
    type: DataTypes.ENUM('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'),
    defaultValue: 'FREE'
  },
  monthly_booking_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  current_month_bookings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  subscription_expires_at: {
    type: DataTypes.DATE
  },
  owner_name: {
    type: DataTypes.STRING(255)
  },
  owner_phone: {
    type: DataTypes.STRING(15)
  },
  owner_email: {
    type: DataTypes.STRING(255)
  },
  registration_number: {
    type: DataTypes.STRING(100)
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIVE'
  }
}, {
  tableName: 'hospitals',
  timestamps: true
});

export default Hospital;
