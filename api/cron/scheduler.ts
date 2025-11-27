import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runScheduler } from '../../server/scheduler.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a cron request (optional security check)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Starting scheduler run...');
    await runScheduler();
    console.log('[Cron] Scheduler run completed');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Scheduler run completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Error running scheduler:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Scheduler run failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

