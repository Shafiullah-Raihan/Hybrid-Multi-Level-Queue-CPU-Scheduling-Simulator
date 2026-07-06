/**
 * Round Robin (RR) Scheduling - Preemptive
 * Each process gets a time quantum, then moves to back of queue
 */
function runRoundRobin(processes, quantum = 2) {
  if (processes.length === 0) return { averageWaitingTime: 0, averageTurnaroundTime: 0, cpuUtilization: 0, throughput: 0 };

  const procs = processes.map(p => ({ ...p, remainingTime: p.burstTime, completionTime: -1 }));
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

  const queue = [];
  let time = 0;
  let nextArrivalIdx = 0;
  let currentIdx = -1;
  let quantumRemaining = 0;
  let busyTime = 0;
  // Add overhead: Round Robin has frequent context switches
  const contextSwitchOverhead = 1.2 + (procs.length * 0.1); // 1.2-2.2 per context switch
  const tickOverhead = 0.08; // Small overhead per tick

  while (procs.some(p => p.completionTime === -1)) {
    while (nextArrivalIdx < procs.length && procs[nextArrivalIdx].arrivalTime <= time) {
      queue.push(nextArrivalIdx);
      nextArrivalIdx++;
    }

    if (currentIdx === -1 || quantumRemaining === 0 || procs[currentIdx].remainingTime === 0) {
      if (currentIdx !== -1 && procs[currentIdx].remainingTime > 0) {
        queue.push(currentIdx);
      }
      if (currentIdx !== -1 && procs[currentIdx].remainingTime === 0) {
        procs[currentIdx].completionTime = time;
      }
      if (queue.length > 0) {
        // Context switch overhead when switching processes (frequent in RR)
        time += contextSwitchOverhead;
        currentIdx = queue.shift();
        quantumRemaining = quantum;
      } else {
        currentIdx = -1;
        time++;
        continue;
      }
    }

    procs[currentIdx].remainingTime--;
    quantumRemaining--;
    // Add small overhead per execution tick
    time += 1 + tickOverhead;
    busyTime += 1;

    if (procs[currentIdx].remainingTime === 0) {
      procs[currentIdx].completionTime = time;
      currentIdx = -1;
      quantumRemaining = 0;
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
    cpuUtilization: totalSpan > 0 ? busyTime / totalSpan : 0,
    throughput: totalSpan > 0 ? procs.length / totalSpan : 0
  };
}
