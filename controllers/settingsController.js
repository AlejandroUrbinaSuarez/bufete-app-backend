const { SiteSetting } = require('../models');
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

class SettingsController {
  /**
   * Obtener configuraciones públicas (contacto, horarios, etc.)
   * GET /api/settings/public
   */
  async getPublicSettings(req, res, next) {
    try {
      const cacheKey = `${CACHE_KEYS.SETTINGS || 'settings'}:public`;

      const settings = await cacheService.getOrSet(cacheKey, async () => {
        const publicKeys = [
          'site_phone',
          'site_email',
          'site_address',
          'site_schedule',
          'site_schedule_weekend'
        ];

        const records = await SiteSetting.findAll({
          where: { setting_key: publicKeys }
        });

        // Convertir a objeto { key: value }
        const result = {};
        records.forEach(record => {
          result[record.setting_key] = record.getValue();
        });

        return result;
      }, CACHE_TTL.LONG);

      res.json(settings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
