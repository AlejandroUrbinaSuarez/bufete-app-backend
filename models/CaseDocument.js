module.exports = (sequelize, DataTypes) => {
  const CaseDocument = sequelize.define('CaseDocument', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cases',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre del archivo en el sistema'
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre original del archivo'
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tamaño en bytes'
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_encrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'case_documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Formatear tamaño de archivo
  CaseDocument.prototype.getFormattedSize = function() {
    if (!this.file_size) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.file_size) / Math.log(1024));
    return `${(this.file_size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return CaseDocument;
};
