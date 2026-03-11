// Simple in-memory job queue without Redis dependency
const jobs = new Map();
let jobIdCounter = 1;
let processorFunction = null;

export function createJobQueue() {
  const queue = {
    async add(jobName, data) {
      const jobId = `job-${jobIdCounter++}`;
      const job = {
        id: jobId,
        name: jobName,
        data,
        state: 'waiting',
        _progress: null,
        returnvalue: null,
        failedReason: null,
        // Progress setter function
        progress: function(progress) {
          this._progress = progress;
        }
      };
      
      // Add getter for reading progress (separate from the function)
      Object.defineProperty(job, 'progressValue', {
        get: function() {
          return this._progress;
        },
        enumerable: true
      });
      
      jobs.set(jobId, job);
      console.log(`Job ${jobId} added to queue`);
      
      // Process immediately if processor is registered
      if (processorFunction) {
        console.log(`Job ${jobId} - Processor is registered, scheduling processing in 100ms...`);
        setTimeout(() => {
          console.log(`Job ${jobId} - Starting processing now...`);
          processJob(job, processorFunction);
        }, 100);
      } else {
        console.warn(`Job ${jobId} - Processor not registered yet, job will be processed when processor is registered`);
      }
      
      return job;
    },
    
    async getJob(jobId) {
      return jobs.get(jobId) || null;
    },
    
    process(jobName, concurrency, processor) {
      // Store processor for later use
      processorFunction = processor;
      console.log(`✓ Job processor registered for: ${jobName} (concurrency: ${concurrency})`);
      
      // Process any waiting jobs
      const waitingJobs = [];
      for (const [jobId, job] of jobs.entries()) {
        if (job.state === 'waiting' && job.name === jobName) {
          waitingJobs.push(job);
        }
      }
      
      if (waitingJobs.length > 0) {
        console.log(`Found ${waitingJobs.length} waiting job(s), processing them now...`);
        waitingJobs.forEach(job => {
          setTimeout(() => {
            console.log(`Processing waiting job: ${job.id}`);
            processJob(job, processor);
          }, 100);
        });
      } else {
        console.log(`No waiting jobs found, processor ready for new jobs`);
      }
    }
  };
  
  return queue;
}

async function processJob(job, processor) {
  job.state = 'active';
  console.log(`[processJob] ===== JOB PROCESSING START =====`);
  console.log(`[processJob] Job ${job.id} state set to: active`);
  console.log(`[processJob] Job data keys:`, job.data ? Object.keys(job.data) : 'no data');
  
  try {
    console.log(`[processJob] Calling processor function for job ${job.id}...`);
    if (!processor || typeof processor !== 'function') {
      throw new Error(`Processor is not a function. Type: ${typeof processor}`);
    }
    
    const result = await processor(job);
    
    // CRITICAL: Set both state and returnvalue
    job.state = 'completed';
    job.returnvalue = result;
    
    console.log(`[processJob] ===== JOB COMPLETION DEBUG =====`);
    console.log(`[processJob] Job ${job.id} state set to: ${job.state}`);
    console.log(`[processJob] Job ${job.id} returnvalue set: ${!!job.returnvalue}`);
    console.log(`[processJob] Job ${job.id} returnvalue keys:`, result ? Object.keys(result) : 'null');
    console.log(`[processJob] Job ${job.id} in Map:`, jobs.has(job.id));
    const retrievedJob = jobs.get(job.id);
    console.log(`[processJob] Retrieved job state: ${retrievedJob?.state}`);
    console.log(`[processJob] Retrieved job returnvalue: ${!!retrievedJob?.returnvalue}`);
    console.log(`[processJob] ===== END DEBUG =====`);
    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    job.state = 'failed';
    job.failedReason = error.message;
    console.error(`\n[processJob] ===== JOB FAILED =====`);
    console.error(`[processJob] Job ${job.id} state set to: failed`);
    console.error(`[processJob] Job ${job.id} failed with error:`, error.message);
    console.error(`[processJob] Error name:`, error.name);
    console.error(`[processJob] Error stack:`, error.stack);
    console.error(`[processJob] ===== END FAILURE DEBUG =====\n`);
    // Don't throw - just mark job as failed
    // This prevents the error from crashing the server
  }
}
