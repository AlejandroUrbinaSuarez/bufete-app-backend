/**
 * Migración para agregar índices de rendimiento a la base de datos
 * Ejecutar: node backend/migrations/001-add-indexes.js
 */

const sequelize = require('../config/database');

const indexes = [
  // Users - búsquedas frecuentes por email y rol
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)',
  'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',

  // Cases - búsquedas por cliente, abogado, estado
  'CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id)',
  'CREATE INDEX IF NOT EXISTS idx_cases_lawyer_id ON cases(lawyer_id)',
  'CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)',
  'CREATE INDEX IF NOT EXISTS idx_cases_service_id ON cases(service_id)',
  'CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at)',

  // Appointments - búsquedas por fecha, abogado, cliente
  'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_lawyer_id ON appointments(lawyer_id)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date, status)',

  // BlogPosts - búsquedas por estado, autor, fecha
  'CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)',
  'CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id)',
  'CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at)',
  'CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)',

  // ContactMessages - búsquedas por estado
  'CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status)',
  'CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at)',

  // ChatSessions - búsquedas por estado, agente
  'CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status)',
  'CREATE INDEX IF NOT EXISTS idx_chat_sessions_assigned_to ON chat_sessions(assigned_to)',
  'CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor_email ON chat_sessions(visitor_email)',

  // ChatMessages - búsquedas por sesión
  'CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)',

  // CaseMessages - búsquedas por caso
  'CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON case_messages(case_id)',
  'CREATE INDEX IF NOT EXISTS idx_case_messages_sender_id ON case_messages(sender_id)',

  // CaseUpdates - búsquedas por caso
  'CREATE INDEX IF NOT EXISTS idx_case_updates_case_id ON case_updates(case_id)',

  // CaseDocuments - búsquedas por caso
  'CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id)',

  // Services - búsquedas por estado activo
  'CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug)',

  // Lawyers - búsquedas por estado activo
  'CREATE INDEX IF NOT EXISTS idx_lawyers_is_active ON lawyers(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_lawyers_user_id ON lawyers(user_id)',

  // Testimonials - búsquedas por estado
  'CREATE INDEX IF NOT EXISTS idx_testimonials_is_approved ON testimonials(is_approved)',
  'CREATE INDEX IF NOT EXISTS idx_testimonials_is_featured ON testimonials(is_featured)',

  // SuccessCases - búsquedas por estado
  'CREATE INDEX IF NOT EXISTS idx_success_cases_is_published ON success_cases(is_published)',
  'CREATE INDEX IF NOT EXISTS idx_success_cases_is_featured ON success_cases(is_featured)',

  // AppointmentSlots - búsquedas por abogado y día
  'CREATE INDEX IF NOT EXISTS idx_appointment_slots_lawyer_id ON appointment_slots(lawyer_id)',
  'CREATE INDEX IF NOT EXISTS idx_appointment_slots_day_of_week ON appointment_slots(day_of_week)',

  // RefreshTokens - búsquedas por usuario y token
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)',

  // AuditLogs - búsquedas por usuario y fecha
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)'
];

async function runMigration() {
  console.log('🔄 Iniciando migración de índices...\n');

  let successful = 0;
  let failed = 0;

  for (const sql of indexes) {
    try {
      await sequelize.query(sql);
      const indexName = sql.match(/idx_\w+/)?.[0] || 'índice';
      console.log(`  ✅ ${indexName}`);
      successful++;
    } catch (error) {
      const indexName = sql.match(/idx_\w+/)?.[0] || 'índice';
      // Ignorar si el índice ya existe
      if (error.message.includes('Duplicate')) {
        console.log(`  ⏭️  ${indexName} (ya existe)`);
        successful++;
      } else {
        console.error(`  ❌ ${indexName}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 Resultado: ${successful} exitosos, ${failed} fallidos`);
  console.log('✅ Migración de índices completada\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  });
}

module.exports = { indexes, runMigration };
