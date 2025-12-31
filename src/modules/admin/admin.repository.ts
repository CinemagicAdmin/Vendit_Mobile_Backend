/**
 * Admin Repository
 *
 * This file re-exports all domain-specific repositories for backward compatibility.
 * The original 390-line file has been split into focused, maintainable modules.
 */

// Dashboard metrics
export * from './repositories/dashboard.repository.js';

// User management
export * from './repositories/users.repository.js';

// Machine management
export * from './repositories/machines.repository.js';

// Product management
export * from './repositories/products.repository.js';

// Order management
export * from './repositories/orders.repository.js';

// Feedback management
export * from './repositories/feedback.repository.js';
