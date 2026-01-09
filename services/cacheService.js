/**
 * Servicio de caché en memoria simple
 * Para aplicaciones de mayor escala, considerar usar Redis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto

    // Limpieza periódica de entradas expiradas
    setInterval(() => this.cleanup(), 60 * 1000); // Cada minuto
  }

  /**
   * Obtener valor del caché
   * @param {string} key - Clave del caché
   * @returns {*} Valor almacenado o null si no existe/expiró
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Almacenar valor en caché
   * @param {string} key - Clave del caché
   * @param {*} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en milisegundos (opcional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Eliminar valor del caché
   * @param {string} key - Clave a eliminar
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Eliminar todas las claves que coincidan con un patrón
   * @param {string} pattern - Patrón (prefijo) a buscar
   */
  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpiar todo el caché
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Limpiadas ${cleaned} entradas expiradas`);
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats() {
    let activeCount = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount
    };
  }

  /**
   * Wrapper para caché con función de carga
   * @param {string} key - Clave del caché
   * @param {Function} loader - Función async que carga los datos si no están en caché
   * @param {number} ttl - Tiempo de vida en milisegundos
   * @returns {*} Valor del caché o resultado del loader
   */
  async getOrSet(key, loader, ttl = this.defaultTTL) {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    this.set(key, value, ttl);
    return value;
  }
}

// Tiempos de caché predefinidos
const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minuto
  MEDIUM: 5 * 60 * 1000,     // 5 minutos
  LONG: 15 * 60 * 1000,      // 15 minutos
  HOUR: 60 * 60 * 1000,      // 1 hora
  DAY: 24 * 60 * 60 * 1000   // 1 día
};

// Claves de caché predefinidas
const CACHE_KEYS = {
  SERVICES_LIST: 'services:list',
  SERVICES_ACTIVE: 'services:active',
  LAWYERS_LIST: 'lawyers:list',
  LAWYERS_ACTIVE: 'lawyers:active',
  TESTIMONIALS_APPROVED: 'testimonials:approved',
  SUCCESS_CASES_PUBLISHED: 'success_cases:published',
  BLOG_RECENT: 'blog:recent',
  SITE_SETTINGS: 'site:settings',
  STATS_DASHBOARD: 'stats:dashboard'
};

// Instancia singleton
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CACHE_TTL,
  CACHE_KEYS
};
