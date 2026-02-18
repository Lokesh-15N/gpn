import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Subscription = sequelize.define('Subscription', {
  subscription_id: {
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
  tier: {
    type: DataTypes.ENUM('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'),
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  booking_limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Monthly booking limit for this tier'
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  payment_method: {
    type: DataTypes.STRING(50),
    comment: 'UPI, Card, Bank Transfer, etc.'
  },
  payment_reference: {
    type: DataTypes.STRING(255),
    comment: 'Transaction ID or payment gateway reference'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING'),
    defaultValue: 'ACTIVE'
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['hospital_id', 'status']
    },
    {
      fields: ['end_date']
    }
  ]
});

export default Subscription;
