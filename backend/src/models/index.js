import sequelize from '../config/database.js';
import Hospital from './Hospital.js';
import Department from './Department.js';
import Doctor from './Doctor.js';
import Patient from './Patient.js';
import Token from './Token.js';
import Subscription from './Subscription.js';

// Define Associations
Hospital.hasMany(Department, { foreignKey: 'hospital_id', as: 'departments' });
Department.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(Doctor, { foreignKey: 'hospital_id', as: 'doctors' });
Doctor.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(Subscription, { foreignKey: 'hospital_id', as: 'subscriptions' });
Subscription.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Department.hasMany(Doctor, { foreignKey: 'primary_dept_id', as: 'doctors' });
Doctor.belongsTo(Department, { foreignKey: 'primary_dept_id', as: 'primaryDepartment' });

Hospital.hasMany(Patient, { foreignKey: 'hospital_id', as: 'patients' });
Patient.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Token.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Token.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
Token.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Token.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Patient.hasMany(Token, { foreignKey: 'patient_id', as: 'tokens' });
Doctor.hasMany(Token, { foreignKey: 'doctor_id', as: 'tokens' });
Department.hasMany(Token, { foreignKey: 'dept_id', as: 'tokens' });

export {
  sequelize,
  Hospital,
  Department,
  Doctor,
  Patient,
  Token,
  Subscription
};

export default {
  sequelize,
  Hospital,
  Department,
  Doctor,
  Patient,
  Token,
  Subscription
};
