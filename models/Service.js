const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    short_description: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del icono (ej: scale, gavel, briefcase)'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
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
    },
    meta_title: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    meta_description: {
      type: DataTypes.STRING(300),
      allowNull: true
    }
  }, {
    tableName: 'services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (service) => {
        if (service.name && !service.slug) {
          service.slug = slugify(service.name, { lower: true, strict: true });
        }
      }
    }
  });

  return Service;
};
