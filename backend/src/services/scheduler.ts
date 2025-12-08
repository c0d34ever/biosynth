import cron from 'node-cron';
import { runDailyAutomation, generateDailyAlgorithms, autoSynthesizeAlgorithms } from './automation.js';

// Schedule daily automation at 2 AM UTC (adjustable via env)
const DAILY_CRON = process.env.AUTOMATION_CRON || '0 2 * * *'; // 2 AM daily

let dailyJob: cron.ScheduledTask | null = null;
let generationJob: cron.ScheduledTask | null = null;
let synthesisJob: cron.ScheduledTask | null = null;

// Start scheduler
export function startScheduler(): void {
  console.log('⏰ Starting automation scheduler...');
  console.log(`📅 Daily automation scheduled: ${DAILY_CRON}`);
  
  // Schedule daily full automation (generation + synthesis + improvement)
  dailyJob = cron.schedule(DAILY_CRON, async () => {
    console.log(`\n🔄 Running scheduled daily automation at ${new Date().toISOString()}`);
    try {
      await runDailyAutomation();
    } catch (error: any) {
      console.error('❌ Scheduled automation failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  // Schedule hourly algorithm generation (runs every hour at minute 0)
  const GENERATION_CRON = process.env.GENERATION_CRON || '0 * * * *';
  generationJob = cron.schedule(GENERATION_CRON, async () => {
    console.log(`\n🤖 Running scheduled hourly algorithm generation at ${new Date().toISOString()}`);
    try {
      await generateDailyAlgorithms();
      console.log('✅ Hourly algorithm generation completed');
    } catch (error: any) {
      console.error('❌ Scheduled algorithm generation failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  // Schedule separate daily algorithm synthesis/combination (runs at 4 AM)
  const SYNTHESIS_CRON = process.env.SYNTHESIS_CRON || '0 4 * * *';
  synthesisJob = cron.schedule(SYNTHESIS_CRON, async () => {
    console.log(`\n🔬 Running scheduled daily algorithm synthesis at ${new Date().toISOString()}`);
    try {
      await autoSynthesizeAlgorithms();
      console.log('✅ Daily algorithm synthesis completed');
    } catch (error: any) {
      console.error('❌ Scheduled algorithm synthesis failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  console.log('✅ Automation scheduler started');
  console.log(`   - Full automation: ${DAILY_CRON}`);
  console.log(`   - Algorithm generation: ${GENERATION_CRON}`);
  console.log(`   - Algorithm synthesis: ${SYNTHESIS_CRON}`);
}

// Stop scheduler
export function stopScheduler(): void {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
  }
  if (generationJob) {
    generationJob.stop();
    generationJob = null;
  }
  if (synthesisJob) {
    synthesisJob.stop();
    synthesisJob = null;
  }
  console.log('⏹️  Automation scheduler stopped');
}

// Get scheduler status
export function getSchedulerStatus(): {
  enabled: boolean;
  schedules: {
    daily: string;
    generation: string;
    synthesis: string;
  };
} {
  return {
    enabled: dailyJob !== null && generationJob !== null && synthesisJob !== null,
    schedules: {
      daily: process.env.AUTOMATION_CRON || '0 2 * * *',
      generation: process.env.GENERATION_CRON || '0 * * * *',
      synthesis: process.env.SYNTHESIS_CRON || '0 4 * * *'
    }
  };
}

// Run automation immediately (for testing/manual triggers)
export async function runAutomationNow(): Promise<void> {
  console.log('🔧 Running automation manually...');
  try {
    await runDailyAutomation();
    console.log('✅ Manual automation completed');
  } catch (error: any) {
    console.error('❌ Manual automation failed:', error);
    throw error;
  }
}

