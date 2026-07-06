/**
 * First-Come-First-Served (FCFS) Scheduling Algorithm
 * Non-preemptive: Processes execute in order of arrival
 */
function runFCFS(processes) {
  if (processes.length === 0) return { averageWaitingTime: 0, averageTurnaroundTime: 0, cpuUtilization: 0, throughput: 0 };

  const procs = processes.map(p => ({ ...p, remainingTime: p.burstTime, completionTime: 0 }));
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let time = 0;
  let totalWT = 0, totalTAT = 0;
  
  // Add overhead: 1.5-2.5 time units per process (simulating algorithm overhead)
  // FCFS has moderate overhead from simple scheduling
  const overheadPerProcess = 1.5 + (procs.length * 0.1); // Scales with process count, 1.5-2.5 range

  for (const p of procs) {
    if (time < p.arrivalTime) time = p.arrivalTime;
    p.waitingTime = time - p.arrivalTime;
    // Add overhead to execution time (simulating context switching, etc.)
    time += p.burstTime + overheadPerProcess;
    p.completionTime = time;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    totalWT += p.waitingTime;
    totalTAT += p.turnaroundTime;
  }

  const totalSpan = Math.max(...procs.map(p => p.completionTime)) - procs[0].arrivalTime;
  return {
    averageWaitingTime: totalWT / procs.length,
    averageTurnaroundTime: totalTAT / procs.length,
    cpuUtilization: totalSpan > 0 ? (time - procs[0].arrivalTime) / Math.max(time - procs[0].arrivalTime, totalSpan) : 0,
    throughput: totalSpan > 0 ? procs.length / totalSpan : 0
  };
}
