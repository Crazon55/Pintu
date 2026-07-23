// Simple in-memory job queue without Redis dependency
const jobs = new Map();
let jobIdCounter = 1;
// jobName -> { processor, concurrency, activeCount }
const processorMeta = new Map();

function tryStartNext(jobName) {
  const meta = processorMeta.get(jobName);
  if (!meta) return;

  while (meta.activeCount < meta.concurrency) {
    let next = null;
    for (const job of jobs.values()) {
      if (job.state === 'waiting' && job.name === jobName) {
        next = job;
        break;
      }
    }
    if (!next) break;

    // Claim immediately so concurrent tryStartNext calls don't pick the same job
    next.state = 'active';
    meta.activeCount++;

    setTimeout(() => {
      console.log(`Job ${next.id} - Starting processing now...`);
      processJob(next, meta.processor).finally(() => {
        meta.activeCount--;
        tryStartNext(jobName);
      });
    }, 100);
  }
}

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
        progress: function (progress) {
          this._progress = progress;
        }
      };

      Object.defineProperty(job, 'progressValue', {
        get: function () {
          return this._progress;
        },
        enumerable: true
      });

      jobs.set(jobId, job);
      console.log(`Job ${jobId} added to queue`);

      const meta = processorMeta.get(jobName);
      if (meta) {
        console.log(`Job ${jobId} - Processor for '${jobName}' is registered, queuing (active ${meta.activeCount}/${meta.concurrency})...`);
        tryStartNext(jobName);
      } else {
        console.warn(`Job ${jobId} - No processor registered for '${jobName}', job will be processed when processor is registered`);
      }

      return job;
    },

    async getJob(jobId) {
      return jobs.get(jobId) || null;
    },

    process(jobName, concurrency, processor) {
      const limit = Math.max(1, concurrency || 1);
      processorMeta.set(jobName, {
        processor,
        concurrency: limit,
        activeCount: 0
      });
      console.log(`✓ Job processor registered for: ${jobName} (concurrency: ${limit})`);

      tryStartNext(jobName);
    }
  };

  return queue;
}

async function processJob(job, processor) {
  // state may already be 'active' if claimed by tryStartNext
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
  }
}
