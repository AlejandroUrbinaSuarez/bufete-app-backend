const Joi = require('joi');

/**
 * Middleware genérico de validación con Joi
 * @param {Joi.Schema} schema - Esquema de Joi para validar
 * @param {string} property - Propiedad de req a validar ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));

      return res.status(400).json({
        error: 'Error de validación',
        details: errors
      });
    }

    // Reemplazar con valores validados y sanitizados
    req[property] = value;
    next();
  };
};

// ===========================================
// ESQUEMAS DE VALIDACIÓN - AUTH
// ===========================================

const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email no es válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es requerida'
    }),
  first_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  last_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'any.required': 'El apellido es requerido'
    }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s-]{10,20}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'El teléfono no es válido'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email no es válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es requerida'
    })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email no es válido',
      'any.required': 'El email es requerido'
    })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'El token es requerido'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es requerida'
    })
});

// ===========================================
// ESQUEMAS DE VALIDACIÓN - CONTACTO
// ===========================================

const contactSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(150)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email no es válido',
      'any.required': 'El email es requerido'
    }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s-]{10,20}$/)
    .allow('')
    .optional(),
  service_id: Joi.number()
    .integer()
    .positive()
    .optional(),
  subject: Joi.string()
    .max(255)
    .optional(),
  message: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': 'El mensaje debe tener al menos 10 caracteres',
      'any.required': 'El mensaje es requerido'
    })
});

// ===========================================
// EXPORTAR VALIDADORES
// ===========================================

module.exports = {
  validate,
  // Auth
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateForgotPassword: validate(forgotPasswordSchema),
  validateResetPassword: validate(resetPasswordSchema),
  // Contact
  validateContact: validate(contactSchema),
  // Esquemas puros (para uso personalizado)
  schemas: {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    contactSchema
  }
};
