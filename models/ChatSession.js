module.exports = (sequelize, DataTypes) => {
  const ChatSession = sequelize.define('ChatSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    visitor_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ID único del visitante (UUID)'
    },
    visitor_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    visitor_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'waiting', 'closed'),
      defaultValue: 'active'
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'chat_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return ChatSession;
};
