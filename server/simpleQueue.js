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
      if (job.state === 'waiting' && job.name === jobName && !job._cancelled) {
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

function markCancelled(job, reason = 'Cancelled by user') {
  job._cancelled = true;
  job.state = 'cancelled';
  job.failedReason = reason;
  job._progress = { ...(job._progress || {}), phase: 'cancelled', percent: 0 };
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
        _cancelled: false,
        _killActive: null, // set by processor to kill FFmpeg / abort work
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

    /**
     * Cancel a waiting or active job. Active jobs should register _killActive
     * (e.g. ffmpeg.kill) so work actually stops and the concurrency slot frees.
     */
    async cancel(jobId) {
      const job = jobs.get(jobId);
      if (!job) return { ok: false, reason: 'not_found' };

      if (job.state === 'completed' || job.state === 'failed' || job.state === 'cancelled') {
        return { ok: true, alreadyDone: true, state: job.state };
      }

      job._cancelled = true;

      if (job.state === 'waiting') {
        markCancelled(job);
        console.log(`Job ${jobId} cancelled while waiting`);
        return { ok: true, state: 'cancelled' };
      }

      // active — kill FFmpeg / in-flight work if registered
      console.log(`Job ${jobId} cancel requested while active — killing...`);
      try {
        if (typeof job._killActive === 'function') {
          job._killActive();
        }
      } catch (err) {
        console.warn(`Job ${jobId} kill error:`, err.message);
      }
      // State becomes cancelled in processJob when the processor rejects/returns
      return { ok: true, state: 'active', killing: true };
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
  if (job._cancelled) {
    markCancelled(job);
    console.log(`[processJob] Job ${job.id} was cancelled before start`);
    return;
  }

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

    if (job._cancelled) {
      markCancelled(job);
      console.log(`Job ${job.id} cancelled after processor returned`);
      return;
    }

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
    if (job._cancelled || error?.name === 'CancelledError' || /cancelled/i.test(error?.message || '')) {
      markCancelled(job);
      console.log(`Job ${job.id} cancelled: ${error?.message || 'user request'}`);
      return;
    }
    job.state = 'failed';
    job.failedReason = error.message;
    console.error(`\n[processJob] ===== JOB FAILED =====`);
    console.error(`[processJob] Job ${job.id} state set to: failed`);
    console.error(`[processJob] Job ${job.id} failed with error:`, error.message);
    console.error(`[processJob] Error name:`, error.name);
    console.error(`[processJob] Error stack:`, error.stack);
    console.error(`[processJob] ===== END FAILURE DEBUG =====\n`);
  } finally {
    job._killActive = null;
  }
}
