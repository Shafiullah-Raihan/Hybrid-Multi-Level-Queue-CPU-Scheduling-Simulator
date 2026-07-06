/**
 * Shortest Job First (SJF) - Non-preemptive Scheduling
 * Selects process with shortest burst time among ready processes
 */
function runSJF(processes) {
  if (processes.length === 0) return { averageWaitingTime: 0, averageTurnaroundTime: 0, cpuUtilization: 0, throughput: 0 };

  const procs = processes.map(p => ({ ...p, remainingTime: p.burstTime, completionTime: 0, waitingTime: 0 }));
  const ready = [];
  let time = 0;
  let completed = 0;

  // Add overhead: 1.8-2.8 time units per process (simulating algorithm overhead)
  // SJF has higher overhead from sorting operations
  const overheadPerProcess = 1.8 + (procs.length * 0.12); // Scales with process count

  while (completed < procs.length) {
    for (const p of procs) {
      if (p.arrivalTime <= time && p.completionTime === 0 && !ready.includes(p)) {
        ready.push(p);
      }
    }

    if (ready.length === 0) {
      time++;
      continue;
    }

    ready.sort((a, b) => a.burstTime - b.burstTime);
    const selected = ready.shift();
    selected.waitingTime = time - selected.arrivalTime;
    // Add overhead to execution time (simulating sorting overhead, context switching, etc.)
    time += selected.burstTime + overheadPerProcess;
    selected.completionTime = time;
    selected.turnaroundTime = selected.completionTime - selected.arrivalTime;
    completed++;
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
