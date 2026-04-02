# Async Scanning Architecture

This document describes the asynchronous scanning architecture implemented for RoboScan to work reliably on Vercel serverless functions.

## Problem

Vercel serverless functions have strict execution time limits (10-60 seconds depending on plan). Website scanning can take longer than this when:
- The target website is slow to respond
- Multiple files (robots.txt, llms.txt, sitemap.xml, etc.) need to be fetched
- Network conditions are poor

This caused 504 Gateway Timeout errors on slow sites.

## Solution

We implemented an **async queue-based architecture** using Upstash QStash:

1. **API triggers scan** → Returns `202 Accepted` with a `jobId` immediately
2. **Background worker** (QStash) → Performs the actual scan
3. **Frontend polls** → Checks `/api/scan-jobs/:jobId/status` for completion

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ API      │────▶│ QStash   │────▶│ Worker   │
│          │     │ /scan    │     │ Queue    │     │ Endpoint │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                                   │
     │           ┌──────────┐                            │
     └──────────▶│ Poll     │◀───────────────────────────┘
                 │ Status   │      (Updates DB)
                 └──────────┘
```

## Environment Variables

Add these to your Vercel project settings:

```bash
# QStash Configuration (from Upstash Console)
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_yyy

# Optional: Override base URL for callbacks
# QSTASH_BASE_URL=https://your-custom-domain.com
```

## Database Migration

Run the migration to create the `scan_jobs` table:

```bash
# Option 1: Using Drizzle Kit
npm run db:push

# Option 2: Manual SQL
psql -d your_database -f migrations/0006_add_scan_jobs.sql
```

## API Endpoints

### POST /api/scan

**Query Parameters:**
- `async=true` - Force async mode (recommended for Vercel)
- `async=false` - Force sync mode (for local development)

**Async Mode Response (202 Accepted):**
```json
{
  "jobId": "uuid-xxx",
  "status": "pending",
  "url": "https://example.com",
  "message": "Scan queued for processing",
  "_links": {
    "status": "/api/scan-jobs/uuid-xxx/status"
  }
}
```

**Sync Mode Response (200 OK):**
```json
{
  "id": 123,
  "url": "https://example.com",
  "robotsTxtFound": true,
  "robotsTxtContent": "...",
  // ... full scan result
}
```

### GET /api/scan-jobs/:jobId/status

Poll this endpoint to check scan progress.

**Response:**
```json
{
  "jobId": "uuid-xxx",
  "status": "processing", // pending | processing | completed | failed
  "url": "https://example.com",
  "progress": 70,
  "progressMessage": "Processing scan results...",
  "createdAt": "2024-01-15T10:00:00Z",
  "startedAt": "2024-01-15T10:00:01Z",
  "completedAt": null
}
```

**On Completion:**
```json
{
  "jobId": "uuid-xxx",
  "status": "completed",
  "scanId": 456,
  "result": {
    "id": 456,
    "url": "https://example.com",
    "robotsTxtFound": true,
    "robotsTxtContent": "...",
    // ... full scan result
  }
}
```

### POST /api/scan-worker

Internal endpoint called by QStash. Not for direct use.

### POST /api/scan-callback

Internal callback endpoint for QStash notifications.

## Frontend Integration

### Using the `useAsyncScan` Hook

```tsx
import { useAsyncScan } from '@/hooks/useAsyncScan';

function ScanComponent() {
  const { 
    isScanning, 
    progress, 
    progressMessage, 
    result, 
    error, 
    scan, 
    cancel 
  } = useAsyncScan({
    onProgress: (progress, message) => {
      console.log(`Progress: ${progress}% - ${message}`);
    },
    onComplete: (result) => {
      console.log('Scan complete:', result);
    },
    onError: (error) => {
      console.error('Scan failed:', error);
    },
  });

  return (
    <div>
      <button onClick={() => scan('https://example.com')}>
        Start Scan
      </button>
      
      {isScanning && (
        <div>
          <progress value={progress} max={100} />
          <p>{progressMessage}</p>
          <button onClick={cancel}>Cancel</button>
        </div>
      )}
      
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Using the `useScan` Hook (Backward Compatible)

The existing `useScan` hook now automatically handles async mode:

```tsx
import { useScan } from '@/hooks/useScan';

const scanMutation = useScan();

// Works the same as before - async polling is handled internally
scanMutation.mutate({ url: 'https://example.com' });
```

## Development

In local development, the system defaults to **sync mode** unless:
1. `QSTASH_TOKEN` is configured
2. `?async=true` query parameter is explicitly set

This allows testing without Upstash during local development.

### Testing Async Mode Locally

1. Sign up for Upstash and get your QStash credentials
2. Set up a tunnel (ngrok, localtunnel) for the callback URL
3. Set `QSTASH_BASE_URL` to your tunnel URL

```bash
# Start ngrok
ngrok http 5000

# Set environment variable
export QSTASH_BASE_URL=https://abc123.ngrok.io
```

## Graceful Degradation

The system gracefully degrades when QStash is not configured:
- **On Vercel without QStash**: Falls back to sync mode (may timeout on slow sites)
- **Local development**: Uses sync mode by default
- **With QStash**: Uses async mode automatically on Vercel

## Timeouts

- **QStash job timeout**: 45 seconds (configurable)
- **Frontend polling**: 2 minutes max (120 polls at 1s interval)
- **Vercel function**: Depends on your plan (10-60s)

## Troubleshooting

### "Scan timed out" Error
- The target website may be extremely slow
- Check QStash dashboard for job status
- Verify callback URL is accessible

### "Invalid signature" Error
- Verify `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` are correct
- Keys rotate periodically - check Upstash console

### Jobs Stuck in "pending"
- Verify `QSTASH_TOKEN` is valid
- Check QStash dashboard for delivery failures
- Ensure worker endpoint is publicly accessible

