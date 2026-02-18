import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Patient = sequelize.define('Patient', {
  patient_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  hospital_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'hospitals',
      key: 'hospital_id'
    }
  },
  uhid: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255)
  },
  date_of_birth: {
    type: DataTypes.DATEONLY
  },
  gender: {
    type: DataTypes.STRING(10)
  },
  address: {
    type: DataTypes.TEXT
  },
  emergency_contact: {
    type: DataTypes.STRING(15)
  },
  fcm_token: {
    type: DataTypes.TEXT
  },
  whatsapp_opt_in: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sms_opt_in: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'patients',
  timestamps: true
});

export default Patient;
