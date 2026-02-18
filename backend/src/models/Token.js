import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Token = sequelize.define('Token', {
  token_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  token_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'patient_id'
    }
  },
  doctor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'doctor_id'
    }
  },
  dept_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'dept_id'
    }
  },
  hospital_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'hospitals',
      key: 'hospital_id'
    }
  },
  booking_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'ONLINE'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'BOOKED'
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  check_in_time: {
    type: DataTypes.DATE
  },
  check_in_latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  check_in_longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  called_time: {
    type: DataTypes.DATE
  },
  consultation_start_time: {
    type: DataTypes.DATE
  },
  consultation_end_time: {
    type: DataTypes.DATE
  },
  queue_position: {
    type: DataTypes.INTEGER
  },
  estimated_wait_time: {
    type: DataTypes.INTEGER
  },
  eta_updated_at: {
    type: DataTypes.DATE
  },
  visit_reason: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  cancellation_reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'tokens',
  timestamps: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['doctor_id'] },
    { fields: ['dept_id'] },
    { fields: ['hospital_id'] },
    { fields: ['status'] },
    { fields: ['scheduled_time'] },
    { fields: ['doctor_id', 'status', 'queue_position'] }
  ]
});

export default Token;
