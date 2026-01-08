const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const Lawyer = sequelize.define('Lawyer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    full_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    },
    specialty: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    bar_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de colegiado'
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    education: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    languages: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Idiomas separados por coma'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    linkedin_url: {
      type: DataTypes.STRING(500),
      allowNull: true
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
    tableName: 'lawyers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (lawyer) => {
        if (lawyer.full_name && !lawyer.slug) {
          lawyer.slug = slugify(lawyer.full_name, { lower: true, strict: true });
        }
      }
    }
  });

  // Método para obtener idiomas como array
  Lawyer.prototype.getLanguagesArray = function() {
    return this.languages ? this.languages.split(',').map(l => l.trim()) : [];
  };

  return Lawyer;
};
