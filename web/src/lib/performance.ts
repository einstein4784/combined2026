/**
 * Performance monitoring utilities
 * Zero-risk addition - only logs, doesn't affect data
 */

type QueryMetrics = {
  name: string;
  duration: number;
  timestamp: Date;
};

const slowQueryThreshold = 1000; // 1 second

/**
 * Track query performance and log slow queries
 * Usage: await trackQuery('findPolicies', () => Policy.find().lean())
 */
export async function trackQuery<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    if (duration > slowQueryThreshold) {
      console.warn(`⚠️  Slow query detected: ${name} took ${duration}ms`);
      
      // In production, you could send this to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        // monitoringService.trackMetric({ name, duration });
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Query: ${name} completed in ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query failed: ${name} after ${duration}ms`, error);
    throw error;
  }
}

/**
 * Create a performance timer for manual tracking
 * Usage:
 *   const timer = perfTimer('myOperation');
 *   // ... do work ...
 *   timer.end();
 */
export function perfTimer(name: string) {
  const start = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - start;
      if (duration > slowQueryThreshold) {
        console.warn(`⚠️  Slow operation: ${name} took ${duration}ms`);
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Operation: ${name} completed in ${duration}ms`);
      }
      return duration;
    }
  };
}

/**
 * Log database query patterns in development
 */
export function enableQueryLogging() {
  if (process.env.NODE_ENV === 'development') {
    const mongoose = require('mongoose');
    mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
      console.log(`🔍 MongoDB: ${collectionName}.${method}`, {
        query: JSON.stringify(query).substring(0, 100),
        ...(doc ? { doc: JSON.stringify(doc).substring(0, 100) } : {})
      });
    });
  }
}


