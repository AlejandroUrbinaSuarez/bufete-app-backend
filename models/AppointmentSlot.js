module.exports = (sequelize, DataTypes) => {
  const AppointmentSlot = sequelize.define('AppointmentSlot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lawyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lawyers',
        key: 'id'
      }
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=Domingo, 1=Lunes, ... 6=Sábado'
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'appointment_slots',
    timestamps: false
  });

  // Nombres de días en español
  AppointmentSlot.DAY_NAMES = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  return AppointmentSlot;
};
