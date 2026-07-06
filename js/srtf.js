/**
 * Shortest Remaining Time First (SRTF) - Preemptive SJF
 * Preempts running process if shorter job arrives
 */
function runSRTF(processes) {
  if (processes.length === 0) return { averageWaitingTime: 0, averageTurnaroundTime: 0, cpuUtilization: 0, throughput: 0 };

  const procs = processes.map(p => ({ ...p, remainingTime: p.burstTime, completionTime: -1, startTime: -1 }));
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let time = 0;
  let currentIdx = -1;
  const completed = new Set();
  // Add overhead: SRTF has high overhead from frequent preemptions and sorting
  const contextSwitchOverhead = 1.0 + (procs.length * 0.15); // 1.0-2.5 per context switch
  const tickOverhead = 0.12; // Small overhead per tick

  while (completed.size < procs.length) {
    const ready = procs.filter((p, idx) => 
      p.arrivalTime <= time && p.completionTime === -1 && !completed.has(idx)
    );

    if (ready.length === 0) {
      time++;
      continue;
    }

    ready.sort((a, b) => a.remainingTime - b.remainingTime);
    const nextIdx = procs.indexOf(ready[0]);

    if (currentIdx !== nextIdx) {
      // Context switch overhead when switching processes (frequent in SRTF)
      time += contextSwitchOverhead;
      currentIdx = nextIdx;
      if (procs[currentIdx].startTime === -1) {
        procs[currentIdx].startTime = time;
      }
    }

    procs[currentIdx].remainingTime--;
    // Add small overhead per execution tick (simulating algorithm overhead)
    time += 1 + tickOverhead;

    if (procs[currentIdx].remainingTime === 0) {
      procs[currentIdx].completionTime = time;
      completed.add(currentIdx);
      currentIdx = -1;
    }
  }

  for (const p of procs) {
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
  }

  const totalWT = procs.reduce((sum, p) => sum + p.waitingTime, 0);
  const totalTAT = procs.reduce((sum, p) => sum + p.turnaroundTime, 0);
  const totalSpan = Math.max(...procs.map(p => p.completionTime)) - procs[0].arrivalTime;

  return {
    averageWaitingTime: totalWT / procs.length,
    averageTurnaroundTime: totalTAT / procs.length,
    cpuUtilization: totalSpan > 0 ? 1 : 0,
    throughput: totalSpan > 0 ? procs.length / totalSpan : 0
  };
}
