module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['token']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  // Método para verificar si el token ha expirado
  RefreshToken.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  // Método para verificar si el token es válido
  RefreshToken.prototype.isValid = function() {
    return !this.is_revoked && !this.isExpired();
  };

  return RefreshToken;
};
