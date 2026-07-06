/**
 * ============================================
 * USER INTERFACE CODE
 * ============================================
 */

// DOM element references
const tbody = document.querySelector('#process-table tbody');
const addRowBtn = document.getElementById('add-row');
const runSimBtn = document.getElementById('run-sim');
const formError = document.getElementById('form-error');
const ganttContainer = document.getElementById('gantt-container');
const ganttRow = document.getElementById('gantt-row');
const ganttTime = document.getElementById('gantt-time');
const metricsEl = document.getElementById('metrics');
const avgWtEl = document.getElementById('avg-wt');
const avgTatEl = document.getElementById('avg-tat');
const cpuUtilEl = document.getElementById('cpu-util');
const throughputEl = document.getElementById('throughput');
const metricsTableWrapper = document.getElementById('metrics-table-wrapper');
const metricsTableBody = document.querySelector('#metrics-table tbody');
const rrQuantumInput = document.getElementById('rr-quantum');
const agingThresholdInput = document.getElementById('aging-threshold');
const comparisonContainer = document.getElementById('comparison-container');
const comparisonTableBody = document.getElementById('comparison-table-body');
const clearAllBtn = document.getElementById('clear-all');
const presetSelect = document.getElementById('preset-select');

/**
 * Create a new row in the process table
 */
function createRow(id = '', arrival = '', burst = '', type = '0') {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>
      <input type="number" min="0" value="${id}" placeholder="P" />
    </td>
    <td>
      <input type="number" min="0" value="${arrival}" />
    </td>
    <td>
      <input type="number" min="1" value="${burst}" />
    </td>
    <td>
      <select>
        <option value="0" ${type === '0' ? 'selected' : ''}>0 – Interactive</option>
        <option value="1" ${type === '1' ? 'selected' : ''}>1 – Batch</option>
      </select>
    </td>
    <td class="row-actions">
      <button class="btn-remove" title="Remove row">
        <span>✕</span>
      </button>
    </td>
  `;

  tr.querySelector('.btn-remove').addEventListener('click', () => {
    tr.remove();
  });

  tbody.appendChild(tr);
}

// Initialize with example processes
createRow(1, 0, 5, '0');
createRow(2, 1, 3, '1');
createRow(3, 2, 4, '0');

// Add row button handler
addRowBtn.addEventListener('click', () => {
  const nextId = tbody.children.length + 1;
  createRow(nextId, 0, 1, '0');
});

// Clear all button handler
clearAllBtn.addEventListener('click', () => {
  tbody.innerHTML = '';
  ganttContainer.style.display = 'none';
  metricsEl.style.display = 'none';
  metricsTableWrapper.style.display = 'none';
  comparisonContainer.style.display = 'none';
});

// Preset examples
const presets = {
  simple: [
    { id: 1, arrivalTime: 0, burstTime: 5, type: 0 },
    { id: 2, arrivalTime: 1, burstTime: 3, type: 0 },
    { id: 3, arrivalTime: 2, burstTime: 4, type: 0 }
  ],
  mixed: [
    { id: 1, arrivalTime: 0, burstTime: 5, type: 0 },
    { id: 2, arrivalTime: 1, burstTime: 3, type: 1 },
    { id: 3, arrivalTime: 2, burstTime: 4, type: 0 },
    { id: 4, arrivalTime: 3, burstTime: 6, type: 1 }
  ],
  starvation: [
    { id: 1, arrivalTime: 0, burstTime: 10, type: 1 },
    { id: 2, arrivalTime: 1, burstTime: 2, type: 0 },
    { id: 3, arrivalTime: 2, burstTime: 2, type: 0 },
    { id: 4, arrivalTime: 3, burstTime: 2, type: 0 },
    { id: 5, arrivalTime: 4, burstTime: 3, type: 0 }
  ],
  complex: [
    { id: 1, arrivalTime: 0, burstTime: 7, type: 0 },
    { id: 2, arrivalTime: 2, burstTime: 4, type: 1 },
    { id: 3, arrivalTime: 4, burstTime: 1, type: 0 },
    { id: 4, arrivalTime: 5, burstTime: 4, type: 1 },
    { id: 5, arrivalTime: 6, burstTime: 3, type: 0 },
    { id: 6, arrivalTime: 8, burstTime: 5, type: 1 }
  ]
};

// Preset selector handler
presetSelect.addEventListener('change', (e) => {
  const preset = e.target.value;
  if (!preset) return;

  const presetData = presets[preset];
  if (presetData) {
    tbody.innerHTML = '';
    for (const proc of presetData) {
      createRow(proc.id, proc.arrivalTime, proc.burstTime, String(proc.type));
    }
    presetSelect.value = '';
  }
});

/**
 * Collect and validate processes from the table
 */
function collectProcesses() {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const processes = [];

  for (const tr of rows) {
    const [idInput, arrivalInput, burstInput, typeSelect] =
      tr.querySelectorAll('input, select');
    
    const id = idInput.value.trim() === '' 
      ? processes.length + 1 
      : Number(idInput.value);
    const arrivalTime = Number(arrivalInput.value);
    const burstTime = Number(burstInput.value);
    const type = Number(typeSelect.value);

    if (Number.isNaN(id) ||
        Number.isNaN(arrivalTime) ||
        Number.isNaN(burstTime) ||
        arrivalTime < 0 ||
        burstTime <= 0 ||
        (type !== 0 && type !== 1)) {
      throw new Error('Each row must have valid numeric ID, Arrival ≥ 0, Burst ≥ 1, and Type 0/1.');
    }

    processes.push({ id, arrivalTime, burstTime, type });
  }

  if (processes.length === 0) {
    throw new Error('Please add at least one process.');
  }

  return processes;
}

/**
 * Render Gantt chart visualization
 */
function renderGantt(timeline) {
  if (!timeline || timeline.length === 0) {
    ganttContainer.style.display = 'none';
    return;
  }

  ganttContainer.style.display = 'block';
  ganttRow.innerHTML = '';
  ganttTime.innerHTML = '';

  const maxTime = Math.max(...timeline.map((t) => t.time)) + 1;

  for (let t = 0; t < maxTime; t++) {
    const entry = timeline.find((e) => e.time === t);
    const cell = document.createElement('div');
    cell.className = 'gantt-cell';

    if (!entry || entry.processId === -1 || entry.queue === 0) {
      cell.classList.add('idle');
      cell.textContent = '–';
      const small = document.createElement('small');
      small.textContent = t;
      cell.appendChild(small);
    } else {
      const isQ1 = entry.queue === 1;
      cell.classList.add(isQ1 ? 'rr' : 'fcfs');
      cell.textContent = 'P' + entry.processId;
      const small = document.createElement('small');
      small.textContent = isQ1 ? 'Q1' : 'Q2';
      cell.appendChild(small);
    }

    ganttRow.appendChild(cell);

    const tick = document.createElement('div');
    tick.textContent = t;
    ganttTime.appendChild(tick);
  }
}

/**
 * Render metrics and process details table
 */
function renderMetrics(data) {
  if (!data || !Array.isArray(data.processes)) {
    metricsEl.style.display = 'none';
    metricsTableWrapper.style.display = 'none';
    return;
  }

  metricsEl.style.display = 'grid';
  metricsTableWrapper.style.display = 'block';

  avgWtEl.textContent = data.averageWaitingTime.toFixed(2);
  avgTatEl.textContent = data.averageTurnaroundTime.toFixed(2);
  cpuUtilEl.textContent = (data.cpuUtilization * 100).toFixed(1) + '%';
  throughputEl.textContent = data.throughput.toFixed(3);

  metricsTableBody.innerHTML = '';
  for (const p of data.processes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>P${p.id}</td>
      <td>
        <span class="pill ${p.type === 0 ? 'pill-interactive' : 'pill-batch'}">
          ${p.type === 0 ? 'Interactive (Q1)' : 'Batch (Q2)'}
        </span>
      </td>
      <td>${p.arrivalTime}</td>
      <td>${p.burstTime}</td>
      <td>${p.waitingTime}</td>
      <td>${p.turnaroundTime}</td>
      <td>${p.completionTime}</td>
    `;
    metricsTableBody.appendChild(tr);
  }
}

/**
 * Render algorithm comparison table
 */
function renderComparison(processes, rrQuantum) {
  if (!processes || processes.length === 0) {
    comparisonContainer.style.display = 'none';
    return;
  }

  const agingThreshold = Math.max(1, Number(agingThresholdInput.value) || 10);
  const schedulerResult = runScheduler(processes, rrQuantum, agingThreshold);

  // Run other algorithms once and store results
  const fcfsResult = runFCFS(processes);
  const sjfResult = runSJF(processes);
  const srtfResult = runSRTF(processes);
  const priorityResult = runPriority(processes);
  const rrResult = runRoundRobin(processes, rrQuantum);

  const results = [
    {
      name: 'Hybrid MLQ',
      fullName: 'Hybrid Multi-Level Queue (Your Scheduler)',
      averageWaitingTime: schedulerResult.averageWaitingTime,
      averageTurnaroundTime: schedulerResult.averageTurnaroundTime,
      cpuUtilization: schedulerResult.cpuUtilization,
      throughput: schedulerResult.throughput,
      type: 'Preemptive'
    },
    {
      name: 'FCFS',
      fullName: 'First-Come-First-Served',
      ...fcfsResult,
      type: 'Non-preemptive'
    },
    {
      name: 'SJF',
      fullName: 'Shortest Job First',
      ...sjfResult,
      type: 'Non-preemptive'
    },
    {
      name: 'SRTF',
      fullName: 'Shortest Remaining Time First',
      ...srtfResult,
      type: 'Preemptive'
    },
    {
      name: 'Priority',
      fullName: 'Priority Scheduling',
      ...priorityResult,
      type: 'Non-preemptive'
    },
    {
      name: 'Round Robin',
      fullName: `Round Robin (q=${rrQuantum})`,
      ...rrResult,
      type: 'Preemptive'
    }
  ];

  const bestWT = Math.min(...results.map(r => r.averageWaitingTime));
  const bestTAT = Math.min(...results.map(r => r.averageTurnaroundTime));
  const bestUtil = Math.max(...results.map(r => r.cpuUtilization));
  const bestThroughput = Math.max(...results.map(r => r.throughput));

  comparisonTableBody.innerHTML = '';
  for (const result of results) {
    const tr = document.createElement('tr');
    
    const wtClass = Math.abs(result.averageWaitingTime - bestWT) < 0.001 ? 'best-metric' : '';
    const tatClass = Math.abs(result.averageTurnaroundTime - bestTAT) < 0.001 ? 'best-metric' : '';
    const utilClass = Math.abs(result.cpuUtilization - bestUtil) < 0.001 ? 'best-metric' : '';
    const thruClass = Math.abs(result.throughput - bestThroughput) < 0.001 ? 'best-metric' : '';

    tr.innerHTML = `
      <td><strong>${result.name}</strong><br><small style="color: #9ca3af;">${result.fullName}</small></td>
      <td class="${wtClass}">${result.averageWaitingTime.toFixed(2)}</td>
      <td class="${tatClass}">${result.averageTurnaroundTime.toFixed(2)}</td>
      <td class="${utilClass}">${(result.cpuUtilization * 100).toFixed(1)}%</td>
      <td class="${thruClass}">${result.throughput.toFixed(3)}</td>
      <td><span class="pill ${result.type === 'Preemptive' ? 'pill-interactive' : 'pill-batch'}">${result.type}</span></td>
    `;
    comparisonTableBody.appendChild(tr);
  }

  comparisonContainer.style.display = 'block';
}

// Run simulation button handler
runSimBtn.addEventListener('click', () => {
  formError.style.display = 'none';
  formError.textContent = '';

  let processes;
  try {
    processes = collectProcesses();
  } catch (err) {
    formError.style.display = 'block';
    formError.textContent = err.message;
    return;
  }

  const rrQuantum = Math.max(1, Number(rrQuantumInput.value) || 2);
  const agingThreshold = Math.max(1, Number(agingThresholdInput.value) || 10);

  runSimBtn.disabled = true;
  runSimBtn.textContent = 'Running...';

  try {
    const data = runScheduler(processes, rrQuantum, agingThreshold);
    renderGantt(data.timeline || []);
    renderMetrics(data);
    renderComparison(processes, rrQuantum);
  } catch (err) {
    formError.style.display = 'block';
    formError.textContent = err.message || 'Simulation failed.';
  } finally {
    runSimBtn.disabled = false;
    runSimBtn.textContent = 'Run Simulation';
  }
});
