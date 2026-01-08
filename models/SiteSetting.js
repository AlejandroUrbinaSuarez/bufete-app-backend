module.exports = (sequelize, DataTypes) => {
  const SiteSetting = sequelize.define('SiteSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    setting_type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      defaultValue: 'string'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'site_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Método para obtener valor parseado según tipo
  SiteSetting.prototype.getValue = function() {
    switch (this.setting_type) {
      case 'number':
        return parseFloat(this.setting_value);
      case 'boolean':
        return this.setting_value === 'true';
      case 'json':
        try {
          return JSON.parse(this.setting_value);
        } catch {
          return null;
        }
      default:
        return this.setting_value;
    }
  };

  // Método estático para obtener configuración por clave
  SiteSetting.getSetting = async function(key, defaultValue = null) {
    const setting = await SiteSetting.findOne({ where: { setting_key: key } });
    return setting ? setting.getValue() : defaultValue;
  };

  // Método estático para establecer configuración
  SiteSetting.setSetting = async function(key, value, type = 'string', description = null) {
    const stringValue = type === 'json' ? JSON.stringify(value) : String(value);

    const [setting, created] = await SiteSetting.findOrCreate({
      where: { setting_key: key },
      defaults: {
        setting_value: stringValue,
        setting_type: type,
        description
      }
    });

    if (!created) {
      setting.setting_value = stringValue;
      setting.setting_type = type;
      if (description) setting.description = description;
      await setting.save();
    }

    return setting;
  };

  return SiteSetting;
};
