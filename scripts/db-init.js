#!/usr/bin/env node

/**
 * Script de Inicialización de Base de Datos
 * ==========================================
 * Crea todas las tablas, índices y datos iniciales.
 *
 * Uso: npm run db:init
 * O:   node scripts/db-init.js
 */

require('dotenv').config();

const readline = require('readline');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.bold}[${num}]${colors.reset} ${msg}`)
};

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function initDatabase() {
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.bold}🗄️  INICIALIZACIÓN DE BASE DE DATOS${colors.reset}`);
  console.log('='.repeat(50));

  // Importar después de cargar dotenv
  const sequelize = require('../config/database');
  const models = require('../models');
  const bcrypt = require('bcryptjs');

  try {
    // =========================================
    // PASO 1: Verificar conexión
    // =========================================
    log.step(1, 'Verificando conexión a la base de datos...');

    await sequelize.authenticate();
    log.success(`Conectado a: ${process.env.DB_NAME}@${process.env.DB_HOST}`);

    // =========================================
    // PASO 2: Sincronizar modelos (crear tablas)
    // =========================================
    log.step(2, 'Creando/actualizando tablas...');

    await sequelize.sync({ alter: true });

    // Listar tablas creadas
    const [tables] = await sequelize.query('SHOW TABLES');
    log.success(`${tables.length} tablas creadas/actualizadas:`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`   - ${tableName}`);
    });

    // =========================================
    // PASO 3: Crear índices de rendimiento
    // =========================================
    log.step(3, 'Aplicando índices de rendimiento...');

    try {
      const { runMigration } = require('../migrations/001-add-indexes');
      // El script de índices tiene su propia lógica de manejo
      const indexes = require('../migrations/001-add-indexes').indexes;

      let indexCount = 0;
      for (const sql of indexes) {
        try {
          await sequelize.query(sql);
          indexCount++;
        } catch (err) {
          // Ignorar si el índice ya existe
          if (!err.message.includes('Duplicate')) {
            log.warning(`Índice omitido: ${err.message.substring(0, 50)}...`);
          }
        }
      }
      log.success(`${indexCount} índices aplicados`);
    } catch (err) {
      log.warning(`Índices omitidos: ${err.message}`);
    }

    // =========================================
    // PASO 4: Crear roles iniciales
    // =========================================
    log.step(4, 'Verificando roles del sistema...');

    const { Role } = models;
    const roles = [
      { name: 'admin', description: 'Administrador del sistema con acceso completo' },
      { name: 'lawyer', description: 'Abogado del bufete' },
      { name: 'client', description: 'Cliente registrado' }
    ];

    for (const role of roles) {
      const [roleRecord, created] = await Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });

      if (created) {
        log.success(`Rol creado: ${role.name}`);
      } else {
        log.info(`Rol existente: ${role.name}`);
      }
    }

    // =========================================
    // PASO 5: Crear usuario administrador
    // =========================================
    log.step(5, 'Verificando usuario administrador...');

    const { User } = models;
    const adminRole = await Role.findOne({ where: { name: 'admin' } });

    const existingAdmin = await User.findOne({
      where: { role_id: adminRole.id }
    });

    if (existingAdmin) {
      log.info(`Admin existente: ${existingAdmin.email}`);
    } else {
      // Crear admin por defecto
      const defaultPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      const admin = await User.create({
        email: 'admin@bufete.com',
        password: hashedPassword,
        full_name: 'Administrador',
        role_id: adminRole.id,
        is_active: true,
        email_verified: true
      });

      log.success(`Usuario administrador creado:`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Contraseña: ${defaultPassword}`);
      console.log(`   ${colors.yellow}⚠️  IMPORTANTE: Cambia esta contraseña después del primer login${colors.reset}`);
    }

    // =========================================
    // RESUMEN FINAL
    // =========================================
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.green}${colors.bold}✅ BASE DE DATOS INICIALIZADA CORRECTAMENTE${colors.reset}`);
    console.log('='.repeat(50));
    console.log(`
📊 Resumen:
   - Base de datos: ${process.env.DB_NAME}
   - Tablas: ${tables.length}
   - Roles: ${roles.length}

🚀 Próximos pasos:
   1. Ejecutar: npm run dev
   2. Acceder a: http://localhost:5173
   3. Login con: admin@bufete.com / Admin123!
`);

    process.exit(0);

  } catch (error) {
    log.error(`Error en inicialización: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
initDatabase();
