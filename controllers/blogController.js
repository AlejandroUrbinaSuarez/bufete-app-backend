const { BlogPost, BlogCategory, Lawyer, AuditLog } = require('../models');
const slugify = require('slugify');
const { Op } = require('sequelize');

class BlogController {
  // ===========================================
  // CATEGORÍAS - CRUD
  // ===========================================

  /**
   * Obtener todas las categorías (público)
   * GET /api/blog/categories
   */
  async getCategories(req, res, next) {
    try {
      const categories = await BlogCategory.findAll({
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'slug', 'description']
      });

      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener categoría por slug con sus posts
   * GET /api/blog/categories/:slug
   */
  async getCategoryBySlug(req, res, next) {
    try {
      const category = await BlogCategory.findOne({
        where: { slug: req.params.slug },
        include: [{
          model: BlogPost,
          as: 'posts',
          where: { status: 'published' },
          required: false,
          include: [{
            model: Lawyer,
            as: 'author',
            attributes: ['id', 'full_name', 'photo_url']
          }],
          order: [['published_at', 'DESC']]
        }]
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear categoría (admin)
   * POST /api/blog/categories/admin
   */
  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body;

      let slug = slugify(name, { lower: true, strict: true });
      const existingSlug = await BlogCategory.findOne({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      const category = await BlogCategory.create({
        name,
        slug,
        description
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'BlogCategory',
        entityId: category.id,
        newValues: category.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Categoría creada exitosamente',
        category
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar categoría (admin)
   * PUT /api/blog/categories/admin/:id
   */
  async updateCategory(req, res, next) {
    try {
      const category = await BlogCategory.findByPk(req.params.id);

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      const oldValues = category.toJSON();
      const { name, description } = req.body;

      let slug = category.slug;
      if (name && name !== category.name) {
        slug = slugify(name, { lower: true, strict: true });
        const existingSlug = await BlogCategory.findOne({
          where: { slug, id: { [Op.ne]: category.id } }
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      await category.update({
        name: name || category.name,
        slug,
        description: description !== undefined ? description : category.description
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'BlogCategory',
        entityId: category.id,
        oldValues,
        newValues: category.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Categoría actualizada exitosamente',
        category
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar categoría (admin)
   * DELETE /api/blog/categories/admin/:id
   */
  async deleteCategory(req, res, next) {
    try {
      const category = await BlogCategory.findByPk(req.params.id);

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      const oldValues = category.toJSON();
      await category.destroy();

      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'BlogCategory',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================
  // POSTS - CRUD
  // ===========================================

  /**
   * Obtener todos los posts publicados (público)
   * GET /api/blog/posts
   */
  async getPosts(req, res, next) {
    try {
      const { page = 1, limit = 10, category, search } = req.query;
      const offset = (page - 1) * limit;

      const where = { status: 'published' };

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { excerpt: { [Op.like]: `%${search}%` } }
        ];
      }

      const include = [
        {
          model: Lawyer,
          as: 'author',
          attributes: ['id', 'full_name', 'photo_url', 'position']
        },
        {
          model: BlogCategory,
          as: 'categories',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        }
      ];

      // Filtrar por categoría si se especifica
      if (category) {
        include[1].where = { slug: category };
        include[1].required = true;
      }

      const { count, rows: posts } = await BlogPost.findAndCountAll({
        where,
        include,
        order: [['published_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      res.json({
        posts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener post por slug (público)
   * GET /api/blog/posts/:slug
   */
  async getPostBySlug(req, res, next) {
    try {
      const post = await BlogPost.findOne({
        where: { slug: req.params.slug, status: 'published' },
        include: [
          {
            model: Lawyer,
            as: 'author',
            attributes: ['id', 'full_name', 'photo_url', 'position', 'bio']
          },
          {
            model: BlogCategory,
            as: 'categories',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] }
          }
        ]
      });

      if (!post) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      // Incrementar vistas
      await post.incrementViews();

      // Obtener posts relacionados (misma categoría)
      const categoryIds = post.categories.map(c => c.id);
      const relatedPosts = await BlogPost.findAll({
        where: {
          status: 'published',
          id: { [Op.ne]: post.id }
        },
        include: [
          {
            model: BlogCategory,
            as: 'categories',
            where: { id: { [Op.in]: categoryIds } },
            attributes: [],
            through: { attributes: [] }
          },
          {
            model: Lawyer,
            as: 'author',
            attributes: ['id', 'full_name', 'photo_url']
          }
        ],
        limit: 3,
        order: [['published_at', 'DESC']]
      });

      res.json({
        post,
        relatedPosts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los posts (admin - incluye borradores)
   * GET /api/blog/posts/admin/all
   */
  async getAllPostsAdmin(req, res, next) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { excerpt: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: posts } = await BlogPost.findAndCountAll({
        where,
        include: [
          {
            model: Lawyer,
            as: 'author',
            attributes: ['id', 'full_name', 'photo_url']
          },
          {
            model: BlogCategory,
            as: 'categories',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] }
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      res.json({
        posts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener post por ID (admin)
   * GET /api/blog/posts/admin/:id
   */
  async getPostById(req, res, next) {
    try {
      const post = await BlogPost.findByPk(req.params.id, {
        include: [
          {
            model: Lawyer,
            as: 'author',
            attributes: ['id', 'full_name', 'photo_url']
          },
          {
            model: BlogCategory,
            as: 'categories',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] }
          }
        ]
      });

      if (!post) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear post (admin)
   * POST /api/blog/posts/admin
   */
  async createPost(req, res, next) {
    try {
      const {
        title,
        content,
        excerpt,
        featured_image,
        status,
        author_id,
        category_ids,
        meta_title,
        meta_description
      } = req.body;

      // Generar slug único
      let slug = slugify(title, { lower: true, strict: true });
      const existingSlug = await BlogPost.findOne({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // Establecer fecha de publicación si está publicado
      const published_at = status === 'published' ? new Date() : null;

      const post = await BlogPost.create({
        title,
        slug,
        content,
        excerpt,
        featured_image,
        status: status || 'draft',
        author_id,
        meta_title,
        meta_description,
        published_at
      });

      // Asociar categorías
      if (category_ids && category_ids.length > 0) {
        await post.setCategories(category_ids);
      }

      // Recargar con relaciones
      await post.reload({
        include: [
          { model: Lawyer, as: 'author', attributes: ['id', 'full_name'] },
          { model: BlogCategory, as: 'categories', through: { attributes: [] } }
        ]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'create',
        entityType: 'BlogPost',
        entityId: post.id,
        newValues: post.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Artículo creado exitosamente',
        post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar post (admin)
   * PUT /api/blog/posts/admin/:id
   */
  async updatePost(req, res, next) {
    try {
      const post = await BlogPost.findByPk(req.params.id);

      if (!post) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      const oldValues = post.toJSON();
      const {
        title,
        content,
        excerpt,
        featured_image,
        status,
        author_id,
        category_ids,
        meta_title,
        meta_description
      } = req.body;

      // Actualizar slug si cambió el título
      let slug = post.slug;
      if (title && title !== post.title) {
        slug = slugify(title, { lower: true, strict: true });
        const existingSlug = await BlogPost.findOne({
          where: { slug, id: { [Op.ne]: post.id } }
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      // Establecer fecha de publicación si se publica por primera vez
      let published_at = post.published_at;
      if (status === 'published' && post.status !== 'published' && !post.published_at) {
        published_at = new Date();
      }

      await post.update({
        title: title || post.title,
        slug,
        content: content !== undefined ? content : post.content,
        excerpt: excerpt !== undefined ? excerpt : post.excerpt,
        featured_image: featured_image !== undefined ? featured_image : post.featured_image,
        status: status || post.status,
        author_id: author_id || post.author_id,
        meta_title: meta_title !== undefined ? meta_title : post.meta_title,
        meta_description: meta_description !== undefined ? meta_description : post.meta_description,
        published_at
      });

      // Actualizar categorías
      if (category_ids !== undefined) {
        await post.setCategories(category_ids || []);
      }

      // Recargar con relaciones
      await post.reload({
        include: [
          { model: Lawyer, as: 'author', attributes: ['id', 'full_name'] },
          { model: BlogCategory, as: 'categories', through: { attributes: [] } }
        ]
      });

      await AuditLog.log({
        userId: req.user.id,
        action: 'update',
        entityType: 'BlogPost',
        entityId: post.id,
        oldValues,
        newValues: post.toJSON(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Artículo actualizado exitosamente',
        post
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar post (admin)
   * DELETE /api/blog/posts/admin/:id
   */
  async deletePost(req, res, next) {
    try {
      const post = await BlogPost.findByPk(req.params.id);

      if (!post) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      const oldValues = post.toJSON();

      // Eliminar relaciones con categorías
      await post.setCategories([]);
      await post.destroy();

      await AuditLog.log({
        userId: req.user.id,
        action: 'delete',
        entityType: 'BlogPost',
        entityId: req.params.id,
        oldValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Artículo eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cambiar estado del post (admin)
   * PATCH /api/blog/posts/admin/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const post = await BlogPost.findByPk(req.params.id);

      if (!post) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      const { status } = req.body;

      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      // Establecer fecha de publicación si se publica por primera vez
      let published_at = post.published_at;
      if (status === 'published' && !post.published_at) {
        published_at = new Date();
      }

      await post.update({ status, published_at });

      res.json({
        message: `Artículo ${status === 'published' ? 'publicado' : status === 'archived' ? 'archivado' : 'guardado como borrador'}`,
        status: post.status,
        published_at: post.published_at
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener posts recientes (para sidebar/widgets)
   * GET /api/blog/recent
   */
  async getRecentPosts(req, res, next) {
    try {
      const { limit = 5 } = req.query;

      const posts = await BlogPost.findAll({
        where: { status: 'published' },
        attributes: ['id', 'title', 'slug', 'excerpt', 'featured_image', 'published_at'],
        include: [{
          model: Lawyer,
          as: 'author',
          attributes: ['id', 'full_name']
        }],
        order: [['published_at', 'DESC']],
        limit: parseInt(limit)
      });

      res.json(posts);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BlogController();
