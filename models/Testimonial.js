module.exports = (sequelize, DataTypes) => {
  const Testimonial = sequelize.define('Testimonial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    client_title: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Cargo o descripción del cliente'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'testimonials',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Testimonial;
};
