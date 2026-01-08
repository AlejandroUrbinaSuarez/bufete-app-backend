const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const BlogPost = sequelize.define('BlogPost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lawyers',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    excerpt: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    featured_image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft'
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    meta_title: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    meta_description: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'blog_posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (post) => {
        if (post.title && !post.slug) {
          post.slug = slugify(post.title, { lower: true, strict: true });
        }
      },
      beforeUpdate: (post) => {
        // Establecer fecha de publicación cuando se publica
        if (post.changed('status') && post.status === 'published' && !post.published_at) {
          post.published_at = new Date();
        }
      }
    }
  });

  // Incrementar vistas
  BlogPost.prototype.incrementViews = async function() {
    this.views += 1;
    await this.save({ fields: ['views'] });
  };

  return BlogPost;
};
