'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'admin',
        description: 'Administrador del sistema con acceso completo',
        created_at: new Date()
      },
      {
        name: 'lawyer',
        description: 'Abogado del bufete',
        created_at: new Date()
      },
      {
        name: 'client',
        description: 'Cliente registrado',
        created_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
