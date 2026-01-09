const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nationality: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country_of_residence: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  sex: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: true
  },
  education_level: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  experience_level: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  certification: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  national_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  personal_photo_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      // Hash password_hash if it's plain text (not already hashed)
      if (user.password_hash && !user.password_hash.startsWith('$2')) {
        const hashedPassword = await bcrypt.hash(user.password_hash, 12);
        user.password_hash = hashedPassword;
        user.password = hashedPassword; // Keep both in sync
      }
    },
    beforeUpdate: async (user) => {
      // Only hash if password_hash changed AND it's not already hashed
      if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2')) {
        const hashedPassword = await bcrypt.hash(user.password_hash, 12);
        user.password_hash = hashedPassword;
        user.password = hashedPassword; // Keep both in sync
      }
    }
  }
});

// Instance method to check password - checks both fields for compatibility
User.prototype.checkPassword = async function (candidatePassword) {
  // Try password_hash first (primary field)
  if (this.password_hash && this.password_hash.startsWith('$2')) {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  }
  // Fall back to password field
  if (this.password && this.password.startsWith('$2')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return false;
};

module.exports = User;