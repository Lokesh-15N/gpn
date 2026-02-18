import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Department = sequelize.define('Department', {
  dept_id: {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  avg_consultation_time: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15
  },
  buffer_time: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  max_tokens_per_day: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  color_code: {
    type: DataTypes.STRING(7),
    defaultValue: '#007BFF'
  },
  priority_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIVE'
  }
}, {
  tableName: 'departments',
  timestamps: true
});

export default Department;
