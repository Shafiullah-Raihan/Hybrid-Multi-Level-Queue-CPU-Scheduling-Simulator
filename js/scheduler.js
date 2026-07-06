/**
 * ============================================
 * HYBRID MULTI-LEVEL QUEUE CPU SCHEDULER
 * ============================================
 * 
 * Main scheduler implementing Hybrid Multi-Level Queue scheduling:
 * - Queue 1 (Q1): High-priority Interactive processes using Round Robin (RR)
 * - Queue 2 (Q2): Low-priority Batch processes using First-Come-First-Served (FCFS)
 * - Preemption: Q1 processes preempt Q2 processes
 * - Aging: Long-waiting Q2 processes are promoted to Q1 to prevent starvation
 */

class Process {
  constructor(id, arrivalTime, burstTime, type) {
    this.id = id;
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime;
    this.type = type; // 0 = Interactive (Q1 - RR), 1 = Batch (Q2 - FCFS)
    this.remainingTime = burstTime;
    this.completionTime = -1;
    this.waitingTime = 0;
    this.turnaroundTime = 0;
    this.timeInQ2Wait = 0; // For starvation mitigation (aging)
  }
}

class TimelineEntry {
  constructor(time, processId, queue) {
    this.time = time;
    this.processId = processId;
    this.queue = queue;
  }
}

function allFinished(processes) {
  return processes.every(p => p.remainingTime <= 0);
}

function runScheduler(processes, rrQuantum, agingThreshold) {
  if (processes.length === 0) {
    return {
      config: { rrQuantum, agingThreshold },
      timeline: [],
      processes: [],
      averageWaitingTime: 0,
      averageTurnaroundTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      agingPromotions: 0,
      preemptionsFromQ2: 0
    };
  }

  const processObjects = processes.map(p => 
    new Process(p.id, p.arrivalTime, p.burstTime, p.type)
  );

  processObjects.sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) {
      return a.arrivalTime - b.arrivalTime;
    }
    return processObjects.indexOf(a) - processObjects.indexOf(b);
  });

  const processCount = processObjects.length;
  const q1 = [];
  const q2 = [];
  const timeline = [];

  let promotionCount = 0;
  let preemptionCount = 0;
  let time = 0;
  let rrQuantumRemaining = 0;
  let currentIndex = -1;
  let currentQueue = 0;
  let nextArrivalIdx = 0;

  function enqueueNewArrivals(currentTime) {
    while (nextArrivalIdx < processCount && 
           processObjects[nextArrivalIdx].arrivalTime <= currentTime) {
      const idx = nextArrivalIdx++;
      if (processObjects[idx].type === 0) {
        q1.push(idx);
      } else {
        q2.push(idx);
      }
    }
  }

  time = processObjects[0].arrivalTime;
  enqueueNewArrivals(time);

  while (!allFinished(processObjects)) {
    if (currentIndex === -1 || processObjects[currentIndex].remainingTime === 0) {
      currentIndex = -1;
      currentQueue = 0;
      rrQuantumRemaining = 0;

      if (q1.length > 0) {
        currentIndex = q1.shift();
        currentQueue = 1;
        rrQuantumRemaining = rrQuantum;
      } else if (q2.length > 0) {
        currentIndex = q2[0];
        currentQueue = 2;
      }
    }

    if (currentIndex === -1) {
      timeline.push(new TimelineEntry(time, -1, 0));
      time++;
      enqueueNewArrivals(time);
      continue;
    }

    const currentProcess = processObjects[currentIndex];
    timeline.push(new TimelineEntry(time, currentProcess.id, currentQueue));

    currentProcess.remainingTime--;
    if (currentQueue === 1) {
      rrQuantumRemaining--;
    }

    time++;
    enqueueNewArrivals(time);

    if (q2.length > 0) {
      const newQ2 = [];
      for (let i = 0; i < q2.length; i++) {
        const idx = q2[i];
        if (currentQueue === 2 && idx === currentIndex) {
          newQ2.push(idx);
          continue;
        }

        processObjects[idx].timeInQ2Wait++;
        if (processObjects[idx].timeInQ2Wait >= agingThreshold &&
            processObjects[idx].remainingTime > 0) {
          processObjects[idx].type = 0;
          q1.push(idx);
          promotionCount++;
        } else {
          newQ2.push(idx);
        }
      }
      q2.length = 0;
      q2.push(...newQ2);
    }

    if (currentProcess.remainingTime === 0) {
      currentProcess.completionTime = time;
      if (currentQueue === 2 && q2.length > 0 && q2[0] === currentIndex) {
        q2.shift();
      }
      currentIndex = -1;
      currentQueue = 0;
      rrQuantumRemaining = 0;
    } else {
      if (currentQueue === 1 && rrQuantumRemaining === 0) {
        q1.push(currentIndex);
        currentIndex = -1;
        currentQueue = 0;
      }

      if (currentQueue === 2 && q1.length > 0) {
        if (q2.length > 0 && q2[0] === currentIndex) {
          q2.shift();
        }
        q2.unshift(currentIndex);
        preemptionCount++;
        currentIndex = -1;
        currentQueue = 0;
      }
    }
  }

  let totalWaitingTime = 0.0;
  let totalTurnaroundTime = 0.0;
  
  // Calculate real metrics - no artificial optimization
  for (const p of processObjects) {
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    totalWaitingTime += p.waitingTime;
    totalTurnaroundTime += p.turnaroundTime;
  }

  const averageWaitingTime = totalWaitingTime / processCount;
  const averageTurnaroundTime = totalTurnaroundTime / processCount;

  const firstArrival = processObjects[0].arrivalTime;
  let lastCompletion = processObjects[0].completionTime;
  
  for (const p of processObjects) {
    if (p.completionTime > lastCompletion) {
      lastCompletion = p.completionTime;
    }
  }

  const totalSpan = Math.max(0, lastCompletion - firstArrival);
  let busySlots = 0;
  
  for (const entry of timeline) {
    if (entry.processId !== -1 && entry.queue !== 0) {
      busySlots++;
    }
  }

  // Calculate real metrics
  const cpuUtilization = (totalSpan > 0) ? busySlots / totalSpan : 0.0;
  const throughput = (totalSpan > 0) ? processCount / totalSpan : 0.0;

  return {
    config: { rrQuantum, agingThreshold },
    timeline: timeline.map(e => ({
      time: e.time,
      processId: e.processId,
      queue: e.queue
    })),
    processes: processObjects.map(p => ({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      type: p.type,
      waitingTime: p.waitingTime,
      turnaroundTime: p.turnaroundTime,
      completionTime: p.completionTime
    })),
    averageWaitingTime,
    averageTurnaroundTime,
    cpuUtilization,
    throughput,
    agingPromotions: promotionCount,
    preemptionsFromQ2: preemptionCount
  };
}
