const router = require('express').Router();
const blogController = require('../controllers/blogController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ===========================================
// RUTAS PÚBLICAS - CATEGORÍAS
// ===========================================

// Obtener todas las categorías
// GET /api/blog/categories
router.get('/categories', blogController.getCategories);

// Obtener categoría por slug con sus posts
// GET /api/blog/categories/:slug
router.get('/categories/:slug', blogController.getCategoryBySlug);

// ===========================================
// RUTAS PÚBLICAS - POSTS
// ===========================================

// Obtener posts publicados (con paginación)
// GET /api/blog/posts
router.get('/posts', blogController.getPosts);

// Obtener posts recientes (para widgets/sidebar)
// GET /api/blog/recent
router.get('/recent', blogController.getRecentPosts);

// Obtener post por slug
// GET /api/blog/posts/:slug
router.get('/posts/:slug', blogController.getPostBySlug);

// ===========================================
// RUTAS DE ADMINISTRACIÓN - CATEGORÍAS
// ===========================================

// Crear categoría
// POST /api/blog/categories/admin
router.post('/categories/admin', authMiddleware, isAdmin, blogController.createCategory);

// Actualizar categoría
// PUT /api/blog/categories/admin/:id
router.put('/categories/admin/:id', authMiddleware, isAdmin, blogController.updateCategory);

// Eliminar categoría
// DELETE /api/blog/categories/admin/:id
router.delete('/categories/admin/:id', authMiddleware, isAdmin, blogController.deleteCategory);

// ===========================================
// RUTAS DE ADMINISTRACIÓN - POSTS
// ===========================================

// Obtener todos los posts (incluye borradores)
// GET /api/blog/posts/admin/all
router.get('/posts/admin/all', authMiddleware, isAdmin, blogController.getAllPostsAdmin);

// Obtener post por ID
// GET /api/blog/posts/admin/:id
router.get('/posts/admin/:id', authMiddleware, isAdmin, blogController.getPostById);

// Crear post
// POST /api/blog/posts/admin
router.post('/posts/admin', authMiddleware, isAdmin, blogController.createPost);

// Actualizar post
// PUT /api/blog/posts/admin/:id
router.put('/posts/admin/:id', authMiddleware, isAdmin, blogController.updatePost);

// Eliminar post
// DELETE /api/blog/posts/admin/:id
router.delete('/posts/admin/:id', authMiddleware, isAdmin, blogController.deletePost);

// Cambiar estado del post
// PATCH /api/blog/posts/admin/:id/status
router.patch('/posts/admin/:id/status', authMiddleware, isAdmin, blogController.updateStatus);

module.exports = router;
