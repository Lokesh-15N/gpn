import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const Doctor = sequelize.define('Doctor', {
  doctor_id: {
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
  emp_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  specialization: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  primary_dept_id: {
    type: DataTypes.UUID,
    references: {
      model: 'departments',
      key: 'dept_id'
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avg_consultation_time: {
    type: DataTypes.INTEGER,
    defaultValue: 15
  },
  max_tokens_per_session: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  profile_image_url: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIVE'
  },
  last_active_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'doctors',
  timestamps: true,
  hooks: {
    beforeCreate: async (doctor) => {
      if (doctor.password) {
        doctor.password = await bcrypt.hash(doctor.password, 10);
      }
    },
    beforeUpdate: async (doctor) => {
      if (doctor.changed('password')) {
        doctor.password = await bcrypt.hash(doctor.password, 10);
      }
    }
  }
});

Doctor.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default Doctor;
