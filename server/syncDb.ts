import { execSync } from 'child_process'

function autoSync() {
  if (process.env.DATABASE_URL) {
    console.log('[Database] DATABASE_URL detected on Railway.')
    console.log('[Database] Auto-synchronizing all tables to PostgreSQL...')
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
      console.log('[Database] All PostgreSQL tables created & in sync!')
    } catch (err) {
      console.error('[Database] Notice during schema sync:', err)
    }
  } else {
    console.log('[Database] No DATABASE_URL detected. Running in in-memory mode.')
  }
}

autoSync()
