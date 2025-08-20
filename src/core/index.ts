/**
 * VibeCraft Core
 * Central export for all core functionality
 */

// Types
export * from './types';

// Stores
export * from './stores';

// Services
export * from './services';

// Core initialization
export const initializeVibeCraft = async () => {
  try {
    // Initialize services first
    const { initializeServices } = await import('./services');
    await initializeServices();

    // Then initialize stores
    const { initializeStores } = await import('./stores');
    await initializeStores();

    console.log('🚀 VibeCraft core initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize VibeCraft core:', error);
    return false;
  }
};