import swaggerJsdoc from 'swagger-jsdoc';
import { getConfig } from './config/env.js';
const config = getConfig();
const definition = {
  openapi: '3.1.0',
  info: {
    title: 'Vend-IT API',
    version: '1.0.0',
    description: 'Public HTTP interface for the Vend-IT vending platform.'
  },
  servers: [
    {
      url:
        config.nodeEnv === 'production'
          ? 'https://api.vendit.app/api'
          : 'http://localhost:3000/api',
      description: config.nodeEnv === 'production' ? 'Production' : 'Development'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token issued by /auth/login'
      }
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', example: 123.45 },
          env: { type: 'string', example: 'development' }
        }
      },
      PhoneOnlyPayload: {
        type: 'object',
        required: ['countryCode', 'phoneNumber'],
        properties: {
          countryCode: { type: 'string', example: '+965' },
          phoneNumber: { type: 'string', example: '50000000' },
          firstName: { type: 'string', description: 'Optional placeholder first name' },
          lastName: { type: 'string', description: 'Optional placeholder last name' },
          email: {
            type: 'string',
            format: 'email',
            description:
              'Optional placeholder email (actual email can be added later via profile API)'
          },
          deviceType: { type: 'string', example: 'ios' },
          deviceToken: { type: 'string', description: 'Push token captured during onboarding' }
        }
      },
      LoginPayload: { $ref: '#/components/schemas/PhoneOnlyPayload' },
      AuthResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          phoneNumber: { type: 'string' },
          country: { type: 'string', nullable: true },
          countryCode: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          isNotification: { type: 'boolean' },
          status: { type: 'integer' },
          otp: { type: 'string', nullable: true },
          token: { type: 'string' },
          refreshToken: { type: 'string' }
        }
      },
      OtpPayload: {
        type: 'object',
        required: ['otp'],
        properties: {
          otp: { type: 'string', example: '1234', minLength: 4, maxLength: 4 },
          deviceType: { type: 'string' },
          deviceToken: { type: 'string' },
          latitude: { type: 'string', example: '29.3759' },
          longitude: { type: 'string', example: '47.9774' }
        }
      },
      ResendOtpPayload: {
        type: 'object',
        properties: {
          deviceType: { type: 'string' },
          deviceToken: { type: 'string' }
        }
      },
      RefreshPayload: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', description: 'JWT issued by /auth/login or /auth/verify' }
        }
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true }
        }
      },
      EditProfilePayload: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
          avatar: { type: 'string', format: 'binary' }
        }
      },
      Machine: {
        type: 'object',
        properties: {
          u_id: { type: 'string' },
          machine_tag: { type: 'string' },
          location_address: { type: 'string' },
          machine_image_url: { type: 'string', nullable: true }
        }
      },
      Product: {
        type: 'object',
        properties: {
          product_u_id: { type: 'string' },
          description: { type: 'string' },
          unit_price: { type: 'number' },
          brand_name: { type: 'string' },
          product_image_url: { type: 'string' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category_name: { type: 'string' }
        }
      },
      CartProductLine: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 }
        }
      },
      CartItemPayload: {
        type: 'object',
        required: ['machineId', 'slotNumber', 'quantity'],
        properties: {
          machineId: { type: 'string' },
          slotNumber: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 }
        }
      },
      WalletChargePayload: {
        type: 'object',
        required: ['amount', 'tapCustomerId', 'tapCardId'],
        properties: {
          amount: { type: 'number' },
          tapCustomerId: { type: 'string' },
          tapCardId: { type: 'string' },
          machineId: { type: 'string', nullable: true }
        }
      },
      WalletPayPayload: {
        type: 'object',
        required: ['amount', 'machineId', 'products'],
        properties: {
          amount: { type: 'number' },
          machineId: { type: 'string' },
          products: { type: 'array', items: { $ref: '#/components/schemas/CartProductLine' } }
        }
      },
      CardPayPayload: {
        type: 'object',
        required: ['cardId', 'customerId', 'amount', 'machineId', 'products'],
        properties: {
          cardId: { type: 'string' },
          customerId: { type: 'string' },
          amount: { type: 'number' },
          machineId: { type: 'string' },
          products: { type: 'array', items: { $ref: '#/components/schemas/CartProductLine' } }
        }
      },
      ContactPayload: {
        type: 'object',
        required: ['subject', 'message'],
        properties: {
          subject: { type: 'string' },
          message: { type: 'string' }
        }
      },
      RatingPayload: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' }
        }
      },
      NotificationPayload: {
        type: 'object',
        required: ['receiverId', 'title', 'body'],
        properties: {
          receiverId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          type: { type: 'string' },
          data: { type: 'object', additionalProperties: true }
        }
      },
      MessageResponse: {
        type: 'object',
        properties: {
          status: { type: 'number', example: 200 },
          message: { type: 'string', example: 'OTP sent' },
          data: {
            oneOf: [
              { type: 'null' },
              {
                type: 'object',
                properties: {
                  otp: { type: 'string', example: '1234' }
                }
              }
            ]
          }
        }
      },
      // Coupon Schemas
      CouponPayload: {
        type: 'object',
        required: ['code', 'discountType', 'discountValue', 'validFrom', 'validUntil'],
        properties: {
          code: { type: 'string', example: 'SAVE20' },
          description: { type: 'string', example: '20% off your purchase' },
          discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'], example: 'PERCENTAGE' },
          discountValue: { type: 'number', example: 20, description: 'Percentage (0-100) or fixed amount in KWD' },
          minPurchaseAmount: { type: 'number', example: 5.000, description: 'Minimum cart amount in KWD' },
          maxDiscountAmount: { type: 'number', example: 10.000, description: 'Max discount cap in KWD'},
          maxUsesPerUser: { type: 'integer', example: 1, minimum: 1 },
          maxTotalUses: { type: 'integer', example: 100, description: 'Total usage limit (optional)' },
          validFrom: { type: 'string', format: 'date-time', example: '2026-02-01T00:00:00Z' },
          validUntil: { type: 'string', format: 'date-time', example: '2026-12-31T23:59:59Z' },
          isActive: { type: 'boolean', example: true }
        }
      },
      ValidateCouponPayload: {
        type: 'object',
        required: ['code', 'amount'],
        properties: {
          code: { type: 'string', example: 'SAVE20' },
          amount: { type: 'number', example: 10.000, description: 'Cart total in KWD' }
        }
      },
      CouponResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          description: { type: 'string' },
          discount_type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
          discount_value: { type: 'string' },
          min_purchase_amount: { type: 'string' },
          max_discount_amount: { type: 'string' },
          max_uses_per_user: { type: 'integer' },
          current_total_uses: { type: 'integer' },
          valid_from: { type: 'string', format: 'date-time' },
          valid_until: { type: 'string', format: 'date-time' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      // Voucher Schemas
      VoucherPayload: {
        type: 'object',
        required: ['code', 'amount', 'validFrom', 'validUntil'],
        properties: {
          code: { type: 'string', example: 'WELCOME100', description: 'Unique voucher code' },
          description: { type: 'string', example: 'Welcome bonus - 1 KWD credit' },
          amount: { type: 'number', example: 1.000, description: 'Wallet credit amount in KWD' },
          maxRedemptions: { type: 'integer', example: 100, description: 'Total redemption limit (optional)' },
          maxUsesPerUser: { type: 'integer', example: 1, minimum: 1, description: 'Per-user limit' },
          validFrom: { type: 'string', format: 'date-time', example: '2026-02-01T00:00:00Z' },
          validUntil: { type: 'string', format: 'date-time', example: '2026-12-31T23:59:59Z' },
          isActive: { type: 'boolean', example: true }
        }
      },
      RedeemVoucherPayload: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', example: 'WELCOME100', description: 'Voucher code from QR or manual entry' }
        }
      },
      VoucherResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          description: { type: 'string' },
          amount: { type: 'string', description: 'KWD' },
          qr_code_url: { type: 'string', format: 'uri', description: 'Public URL to QR code image' },
          max_redemptions: { type: 'integer' },
          max_uses_per_user: { type: 'integer' },
          current_redemptions: { type: 'integer' },
          valid_from: { type: 'string', format: 'date-time' },
          valid_until: { type: 'string', format: 'date-time' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      // Step Challenge Schemas
      ChallengePayload: {
        type: 'object',
        required: ['name', 'startDate', 'endDate', 'badgeThresholds'],
        properties: {
          name: { type: 'string', example: 'March Fitness Challenge' },
          description: { type: 'string', example: 'Walk your way to better health!' },
          locationLat: { type: 'number', example: 29.3759, description: 'Optional location latitude' },
          locationLong: { type: 'number', example: 47.9774, description: 'Optional location longitude' },
          locationName: { type: 'string', example: 'Kuwait City', description: 'Optional location name' },
          badgeThresholds: {
            type: 'array',
            description: 'Step thresholds for awarding badges',
            example: [
              { steps: 10000, badge_name: 'Bronze Walker', badge_icon: '🥉' },
              { steps: 25000, badge_name: 'Silver Runner', badge_icon: '🥈' },
              { steps: 50000, badge_name: 'Gold Champion', badge_icon: '🥇' }
            ],
            items: {
              type: 'object',
              required: ['steps', 'badge_name', 'badge_icon'],
              properties: {
                steps: { type: 'integer', minimum: 1 },
                badge_name: { type: 'string' },
                badge_icon: { type: 'string', description: 'Emoji or icon identifier' }
              }
            }
          },
          startDate: { type: 'string', format: 'date-time', example: '2026-03-01T00:00:00Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-03-31T23:59:59Z' },
          isActive: { type: 'boolean', example: true }
        }
      },
      SubmitStepsPayload: {
        type: 'object',
        required: ['steps'],
        properties: {
          steps: { type: 'integer', minimum: 1, example: 8500, description: 'Number of steps to submit' },
          source: { type: 'string', example: 'HealthKit', description: 'Optional: GoogleFit, HealthKit, Manual' }
        }
      },
      ChallengeResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          location_lat: { type: 'number' },
          location_long: { type: 'number' },
          location_name: { type: 'string' },
          badge_thresholds: { type: 'array', items: { type: 'object' } },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      BadgeResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          challenge_name: { type: 'string' },
          badge_name: { type: 'string' },
          badge_icon: { type: 'string' },
          badge_type: { type: 'string', enum: ['STEPS', 'RANKING'] },
          steps_achieved: { type: 'integer' },
          awarded_at: { type: 'string', format: 'date-time' }
        }
      },
      LeaderboardEntry: {
        type: 'object',
        properties: {
          rank: { type: 'integer', example: 1 },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              profile_picture: { type: 'string', format: 'uri' }
            }
          },
          total_steps: { type: 'integer', example: 45000 },
          last_submission: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Start registration (send OTP)',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PhoneOnlyPayload' } }
          }
        },
        responses: {
          200: {
            description: 'User record plus token and OTP (OTP echoed in non-production)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          409: { description: 'Phone already verified' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login (also sends OTP)',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginPayload' } } }
        },
        responses: {
          200: {
            description: 'Existing user with token and OTP (OTP echoed in non-production)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          404: { description: 'User not found' }
        }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'Logout current session',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: 'Logged out' } }
      }
    },
    '/auth/verify': {
      post: {
        summary: 'Verify OTP code',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpPayload' } } }
        },
        responses: {
          200: {
            description: 'OTP verified and new token issued',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          400: { description: 'Invalid OTP' }
        }
      }
    },
    '/auth/resend': {
      post: {
        summary: 'Resend OTP',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ResendOtpPayload' } }
          }
        },
        responses: {
          200: {
            description: 'OTP resent',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } }
            }
          }
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshPayload' } },
            'multipart/form-data': { schema: { $ref: '#/components/schemas/RefreshPayload' } }
          }
        },
        responses: {
          200: {
            description: 'New access/refresh token pair',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          401: { description: 'Invalid refresh token' }
        }
      }
    },
    '/users/create-profile': {
      post: {
        summary: 'Create profile shell',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/EditProfilePayload' } }
          }
        },
        responses: { 201: { description: 'Profile created' } }
      }
    },
    '/users/profile': {
      get: {
        summary: 'Current profile',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile data',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } }
            }
          }
        }
      }
    },
    '/users/edit-profile': {
      put: {
        summary: 'Edit profile',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': { schema: { $ref: '#/components/schemas/EditProfilePayload' } }
          }
        },
        responses: { 200: { description: 'Profile updated' } }
      }
    },
    '/users/delete': {
      delete: {
        summary: 'Delete user account',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: 'Account deleted' } }
      }
    },
    '/machines': {
      get: {
        summary: 'List machines near coordinates',
        tags: ['Machines'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'lat', schema: { type: 'number' }, required: true },
          { in: 'query', name: 'lng', schema: { type: 'number' }, required: true }
        ],
        responses: {
          200: {
            description: 'Array of machines',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Machine' } }
              }
            }
          }
        }
      }
    },
    '/machines/sync': {
      post: {
        summary: 'Trigger remote sync',
        tags: ['Machines'],
        responses: { 202: { description: 'Sync queued' } }
      }
    },
    '/machines/{machineId}': {
      get: {
        summary: 'Machine detail',
        tags: ['Machines'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'machineId', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Machine payload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Machine' } } }
          },
          404: { description: 'Not found' }
        }
      }
    },
    '/machines/{machineId}/qr': {
      post: {
        summary: 'Generate machine QR (admin)',
        tags: ['Machines'],
        parameters: [{ in: 'path', name: 'machineId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'QR regenerated' } }
      }
    },
    '/machines/webhooks/silkron': {
      post: {
        summary: 'Silkron webhook',
        tags: ['Webhooks'],
        responses: { 200: { description: 'Accepted' }, 401: { description: 'Invalid signature' } }
      }
    },
    '/machines/webhooks/tap': {
      post: {
        summary: 'Tap webhook',
        tags: ['Webhooks'],
        responses: { 200: { description: 'Accepted' }, 401: { description: 'Invalid signature' } }
      }
    },
    '/products': {
      get: {
        summary: 'List products',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'query', name: 'machineId', schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Product list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
              }
            }
          }
        }
      }
    },
    '/products/categories': {
      get: {
        summary: 'Product categories',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Category list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
              }
            }
          }
        }
      }
    },
    '/products/{productId}': {
      get: {
        summary: 'Single product',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'productId', schema: { type: 'string' }, required: true }],
        responses: { 200: { description: 'Product detail' }, 404: { description: 'Not found' } }
      }
    },
    '/cart': {
      get: {
        summary: 'Get cart',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Cart contents' } }
      },
      post: {
        summary: 'Add to cart',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CartItemPayload' } }
          }
        },
        responses: { 200: { description: 'Item added' } }
      },
      delete: {
        summary: 'Clear cart',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: 'Cart cleared' } }
      }
    },
    '/cart/{cartId}': {
      put: {
        summary: 'Update cart item',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cartId', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CartItemPayload' } }
          }
        },
        responses: { 200: { description: 'Cart updated' } }
      },
      delete: {
        summary: 'Remove cart item',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cartId', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Item removed' } }
      }
    },
    '/payments/cards': {
      get: {
        summary: 'List cards',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Cards array' } }
      },
      post: {
        summary: 'Save card',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Card created' } }
      }
    },
    '/payments/cards/{cardId}': {
      delete: {
        summary: 'Delete card',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cardId', schema: { type: 'string' }, required: true }],
        responses: { 204: { description: 'Card deleted' } }
      }
    },
    '/payments/wallet/charge': {
      post: {
        summary: 'Charge wallet',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/WalletChargePayload' } }
          }
        },
        responses: { 200: { description: 'Wallet charged' } }
      }
    },
    '/payments/wallet/pay': {
      post: {
        summary: 'Wallet purchase',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/WalletPayPayload' } }
          }
        },
        responses: { 200: { description: 'Payment completed' } }
      }
    },
    '/payments/card/pay': {
      post: {
        summary: 'Card purchase',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CardPayPayload' } }
          }
        },
        responses: { 200: { description: 'Card charged' } }
      }
    },
    '/payments/gpay/token': {
      post: {
        summary: 'Google Pay token exchange',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Token stored' } }
      }
    },
    '/payments/gpay/pay': {
      post: {
        summary: 'Google Pay purchase',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Payment completed' } }
      }
    },
    '/payments/ios/pay': {
      post: {
        summary: 'Apple Pay purchase',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Payment completed' } }
      }
    },
    '/payments/history': {
      get: {
        summary: 'Payment history',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'History list' } }
      }
    },
    '/payments/wallet/history': {
      get: {
        summary: 'Wallet history',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'History list' } }
      }
    },
    '/payments/orders/history': {
      get: {
        summary: 'Order history',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'History list' } }
      }
    },
    '/payments/loyalty/history': {
      get: {
        summary: 'Loyalty history',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'History list' } }
      }
    },
    '/payments/dispense': {
      post: {
        summary: 'Update dispense status',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Dispense updated' } }
      }
    },
    '/content/static': {
      get: {
        summary: 'Static CMS content',
        tags: ['Content'],
        responses: { 200: { description: 'Content blob' } }
      }
    },
    '/content/contact': {
      post: {
        summary: 'Contact us form',
        tags: ['Content'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ContactPayload' } }
          }
        },
        responses: { 200: { description: 'Submission accepted' } }
      }
    },
    '/feedback/ratings': {
      get: {
        summary: 'Ratings list',
        tags: ['Feedback'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Ratings array' } }
      },
      post: {
        summary: 'Leave rating',
        tags: ['Feedback'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RatingPayload' } }
          }
        },
        responses: { 201: { description: 'Created' } }
      }
    },
    '/notifications': {
      get: {
        summary: 'List notifications',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Notifications array' } }
      },
      post: {
        summary: 'Send notification',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/NotificationPayload' } }
          }
        },
        responses: { 201: { description: 'Notification enqueued' } }
      },
      delete: {
        summary: 'Clear notifications',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        responses: { 204: { description: 'Cleared' } }
      }
    },
    '/notifications/{notificationId}/read': {
      patch: {
        summary: 'Mark notification read',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'notificationId', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Updated' } }
      }
    },
    '/campaigns/latest': {
      get: {
        summary: 'Latest campaign',
        tags: ['Campaigns'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Current campaign or 204 if none' } }
      }
    },
    // Coupon Endpoints
    '/coupons/validate': {
      post: {
        summary: 'Validate a coupon code',
        description: 'Check if coupon is valid and calculate discount amount',
        tags: ['Coupons'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidateCouponPayload' }
            }
          }
        },
        responses: {
          200: {
            description: 'Coupon is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Coupon is valid' },
                    data: {
                      type: 'object',
                      properties: {
                        discountAmount: { type: 'number', example: 2.000, description: 'KWD' },
                        finalAmount: { type: 'number', example: 8.000, description: 'KWD' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid coupon or validation failed' },
          429: { description: 'Too many validation attempts' }
        }
      }
    },
    '/coupons/available': {
      get: {
        summary: 'List available coupons for user',
        description: 'Get all active coupons that the user can still use',
        tags: ['Coupons'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'List of available coupons',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number', example: 200 },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        coupons: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              code: { type: 'string' },
                              description: { type: 'string' },
                              discountType: { type: 'string' },
                              discountValue: { type: 'number' },
                              minPurchaseAmount: { type: 'number' },
                              validUntil: { type: 'string', format: 'date-time' },
                              remainingUses: { type: 'integer' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    // Voucher Endpoints
    '/vouchers/redeem': {
      post: {
        summary: 'Redeem a voucher code',
        description: 'Redeem voucher and credit wallet. Rate limited to 5 attempts per minute.',
        tags: ['Vouchers'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RedeemVoucherPayload' }
            }
          }
        },
        responses: {
          200: {
            description: 'Voucher redeemed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Voucher redeemed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        amount: { type: 'string', example: '5.000', description: 'Amount credited (KWD)' },
                        newBalance: { type: 'string', example: '15.500', description: 'New wallet balance (KWD)' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid voucher, already used, or expired' },
          404: { description: 'Voucher code not found' },
          429: { description: 'Too many redemption attempts' }
        }
      }
    },
    '/vouchers/history': {
      get: {
        summary: 'Get user voucher redemption history',
        description: 'List all vouchers the user has redeemed',
        tags: ['Vouchers'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: {
            description: 'Redemption history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    data: {
                      type: 'object',
                      properties: {
                        redemptions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              voucher_code: { type: 'string' },
                              amount_credited: { type: 'string' },
                              redeemed_at: { type: 'string', format: 'date-time' }
                            }
                          }
                        },
                        meta: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    // Step Challenge Endpoints
    '/step-challenges/active': {
      get: {
        summary: 'Get active step challenges',
        description: 'List all currently active challenges that users can join',
        tags: ['Step Challenges'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Active challenges',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    data: {
                      type: 'object',
                      properties: {
                        challenges: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ChallengeResponse' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/step-challenges/{id}/register': {
      post: {
        summary: 'Register for a challenge',
        description: 'Join a step challenge. Users can only join one active challenge at a time.',
        tags: ['Step Challenges'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Challenge ID' }
        ],
        responses: {
          200: { description: 'Successfully registered' },
          400: { description: 'Already registered or already in another active challenge' },
          404: { description: 'Challenge not found' }
        }
      }
    },
    '/step-challenges/{id}/submit': {
      post: {
        summary: 'Submit steps for a challenge',
        description: 'Submit step count. Rate limited to 30 submissions per minute. Badges awarded automatically when thresholds reached.',
        tags: ['Step Challenges'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitStepsPayload' }
            }
          }
        },
        responses: {
          200: {
            description: 'Steps submitted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        totalSteps: { type: 'integer', example: 18500 },
                        rank: { type: 'integer', example: 15 },
                        newBadges: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/BadgeResponse' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Not registered or invalid data' },
          429: { description: 'Too many step submissions' }
        }
      }
    },
    '/step-challenges/{id}/progress': {
      get: {
        summary: 'Get user progress in challenge',
        description: 'View total steps, rank, earned badges, and next badge milestone',
        tags: ['Step Challenges'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: {
            description: 'User progress',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    data: {
                      type: 'object',
                      properties: {
                        totalSteps: { type: 'integer' },
                        rank: { type: 'integer' },
                        badges: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/BadgeResponse' }
                        },
                        nextBadge: {
                          type: 'object',
                          properties: {
                            badge_name: { type: 'string' },
                            steps_required: { type: 'integer' },
                            steps_remaining: { type: 'integer' },
                            progress_percentage: { type: 'number' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Not registered for this challenge' }
        }
      }
    },
    '/step-challenges/badges': {
      get: {
        summary: 'Get user badge collection',
        description: 'View all badges earned across all challenges',
        tags: ['Step Challenges'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'User badges',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    data: {
                      type: 'object',
                      properties: {
                        badges: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/BadgeResponse' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
export const openapiSpec = swaggerJsdoc({ definition, apis: [] });
