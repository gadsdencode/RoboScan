import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runScheduler } from '../../server/scheduler.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a cron request (mandatory security check)
  const cronSecret = process.env.CRON_SECRET;
  
  // Require CRON_SECRET to be configured - fail secure if missing
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET environment variable is not configured');
    return res.status(500).json({ message: 'Server misconfiguration' });
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
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

