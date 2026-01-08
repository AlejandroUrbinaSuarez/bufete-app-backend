const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// ===========================================
// IMPORTAR MODELOS
// ===========================================

const Role = require('./Role')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const RefreshToken = require('./RefreshToken')(sequelize, DataTypes);
const Service = require('./Service')(sequelize, DataTypes);
const Lawyer = require('./Lawyer')(sequelize, DataTypes);
const BlogCategory = require('./BlogCategory')(sequelize, DataTypes);
const BlogPost = require('./BlogPost')(sequelize, DataTypes);
const SuccessCase = require('./SuccessCase')(sequelize, DataTypes);
const Testimonial = require('./Testimonial')(sequelize, DataTypes);
const ContactMessage = require('./ContactMessage')(sequelize, DataTypes);
const Case = require('./Case')(sequelize, DataTypes);
const CaseDocument = require('./CaseDocument')(sequelize, DataTypes);
const CaseMessage = require('./CaseMessage')(sequelize, DataTypes);
const CaseUpdate = require('./CaseUpdate')(sequelize, DataTypes);
const Appointment = require('./Appointment')(sequelize, DataTypes);
const AppointmentSlot = require('./AppointmentSlot')(sequelize, DataTypes);
const ChatSession = require('./ChatSession')(sequelize, DataTypes);
const ChatMessage = require('./ChatMessage')(sequelize, DataTypes);
const SiteSetting = require('./SiteSetting')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);

// ===========================================
// DEFINIR ASOCIACIONES
// ===========================================

// User - Role
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// User - RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Lawyer (un usuario puede ser un abogado)
User.hasOne(Lawyer, { foreignKey: 'user_id', as: 'lawyerProfile' });
Lawyer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Lawyer - Service (muchos a muchos)
Lawyer.belongsToMany(Service, {
  through: 'lawyer_services',
  foreignKey: 'lawyer_id',
  otherKey: 'service_id',
  as: 'services'
});
Service.belongsToMany(Lawyer, {
  through: 'lawyer_services',
  foreignKey: 'service_id',
  otherKey: 'lawyer_id',
  as: 'lawyers'
});

// BlogPost - Lawyer (autor)
Lawyer.hasMany(BlogPost, { foreignKey: 'author_id', as: 'blogPosts' });
BlogPost.belongsTo(Lawyer, { foreignKey: 'author_id', as: 'author' });

// BlogPost - BlogCategory (muchos a muchos)
BlogPost.belongsToMany(BlogCategory, {
  through: 'blog_post_categories',
  foreignKey: 'post_id',
  otherKey: 'category_id',
  as: 'categories'
});
BlogCategory.belongsToMany(BlogPost, {
  through: 'blog_post_categories',
  foreignKey: 'category_id',
  otherKey: 'post_id',
  as: 'posts'
});

// SuccessCase - Service
Service.hasMany(SuccessCase, { foreignKey: 'service_id', as: 'successCases' });
SuccessCase.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// Testimonial - Service
Service.hasMany(Testimonial, { foreignKey: 'service_id', as: 'testimonials' });
Testimonial.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// ContactMessage - Service
Service.hasMany(ContactMessage, { foreignKey: 'service_id', as: 'contactMessages' });
ContactMessage.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// ContactMessage - User (asignado a)
User.hasMany(ContactMessage, { foreignKey: 'assigned_to', as: 'assignedContacts' });
ContactMessage.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

// Case - User (cliente)
User.hasMany(Case, { foreignKey: 'client_id', as: 'cases' });
Case.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Case - Lawyer
Lawyer.hasMany(Case, { foreignKey: 'lawyer_id', as: 'cases' });
Case.belongsTo(Lawyer, { foreignKey: 'lawyer_id', as: 'lawyer' });

// Case - Service
Service.hasMany(Case, { foreignKey: 'service_id', as: 'cases' });
Case.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// Case - CaseDocument
Case.hasMany(CaseDocument, { foreignKey: 'case_id', as: 'documents' });
CaseDocument.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });

// CaseDocument - User (subido por)
User.hasMany(CaseDocument, { foreignKey: 'uploaded_by', as: 'uploadedDocuments' });
CaseDocument.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Case - CaseMessage
Case.hasMany(CaseMessage, { foreignKey: 'case_id', as: 'messages' });
CaseMessage.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });

// CaseMessage - User (sender)
User.hasMany(CaseMessage, { foreignKey: 'sender_id', as: 'sentCaseMessages' });
CaseMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Case - CaseUpdate
Case.hasMany(CaseUpdate, { foreignKey: 'case_id', as: 'updates' });
CaseUpdate.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });

// CaseUpdate - User (creado por)
User.hasMany(CaseUpdate, { foreignKey: 'created_by', as: 'caseUpdates' });
CaseUpdate.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Appointment - User (cliente)
User.hasMany(Appointment, { foreignKey: 'client_id', as: 'appointments' });
Appointment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Appointment - Lawyer
Lawyer.hasMany(Appointment, { foreignKey: 'lawyer_id', as: 'appointments' });
Appointment.belongsTo(Lawyer, { foreignKey: 'lawyer_id', as: 'lawyer' });

// Appointment - Service
Service.hasMany(Appointment, { foreignKey: 'service_id', as: 'appointments' });
Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// Appointment - Case (opcional)
Case.hasMany(Appointment, { foreignKey: 'case_id', as: 'appointments' });
Appointment.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });

// AppointmentSlot - Lawyer
Lawyer.hasMany(AppointmentSlot, { foreignKey: 'lawyer_id', as: 'availabilitySlots' });
AppointmentSlot.belongsTo(Lawyer, { foreignKey: 'lawyer_id', as: 'lawyer' });

// ChatSession - User (agente asignado)
User.hasMany(ChatSession, { foreignKey: 'assigned_to', as: 'chatSessions' });
ChatSession.belongsTo(User, { foreignKey: 'assigned_to', as: 'agent' });

// ChatSession - ChatMessage
ChatSession.hasMany(ChatMessage, { foreignKey: 'session_id', as: 'messages' });
ChatMessage.belongsTo(ChatSession, { foreignKey: 'session_id', as: 'session' });

// AuditLog - User
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ===========================================
// EXPORTAR
// ===========================================

module.exports = {
  sequelize,
  Role,
  User,
  RefreshToken,
  Service,
  Lawyer,
  BlogCategory,
  BlogPost,
  SuccessCase,
  Testimonial,
  ContactMessage,
  Case,
  CaseDocument,
  CaseMessage,
  CaseUpdate,
  Appointment,
  AppointmentSlot,
  ChatSession,
  ChatMessage,
  SiteSetting,
  AuditLog
};
