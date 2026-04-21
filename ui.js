import { Simulator, THREAD_STATE } from './simulator.js';

class UIController {
    constructor() {
        this.sim = new Simulator();
        this.lastTime = 0;
        this.animationFrameId = null;

        this.elements = {
            // Metrics
            cpuUtil: document.getElementById('cpu-util'),
            ctxSwitches: document.getElementById('ctx-switches'),
            throughput: document.getElementById('throughput'),
            simTime: document.getElementById('sim-time'),

            // Config values
            valUserThreads: document.getElementById('val-user-threads'),
            valKernelThreads: document.getElementById('val-kernel-threads'),
            valCpus: document.getElementById('val-cpus'),
            valSimSpeed: document.getElementById('val-sim-speed'),

            // Inputs
            numUserThreads: document.getElementById('num-user-threads'),
            numKernelThreads: document.getElementById('num-kernel-threads'),
            numCpus: document.getElementById('num-cpus'),
            simSpeed: document.getElementById('sim-speed'),
            schedulingAlgo: document.getElementById('scheduling-algo'),

            // Buttons
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnReset: document.getElementById('btn-reset'),
            btnSpawnUser: document.getElementById('btn-spawn-user'),
            btnTriggerIo: document.getElementById('btn-trigger-io'),

            // Pools
            userPool: document.getElementById('user-pool'),
            kernelPool: document.getElementById('kernel-pool'),
            cpuPool: document.getElementById('cpu-pool'),
            statsUserSpace: document.getElementById('stats-user-space'),
            statsKernelSpace: document.getElementById('stats-kernel-space'),

            toastContainer: document.getElementById('toast-container')
        };

        this.bindEvents();
        this.updateConfigDisplay();
        this.renderInitialState();
    }

    bindEvents() {
        // Range Inputs
        this.elements.numUserThreads.addEventListener('input', (e) => {
            this.elements.valUserThreads.textContent = e.target.value;
        });
        this.elements.numKernelThreads.addEventListener('input', (e) => {
            this.elements.valKernelThreads.textContent = e.target.value;
        });
        this.elements.numCpus.addEventListener('input', (e) => {
            this.elements.valCpus.textContent = e.target.value;
        });
        this.elements.simSpeed.addEventListener('input', (e) => {
            const val = e.target.value;
            let display = val === '50' ? '1x' : (val > 50 ? `${((val - 50) / 10).toFixed(1)}x` : `0.${val}x`);
            this.elements.valSimSpeed.textContent = display;
            this.sim.speedMultiplier = val / 50;
        });

        this.elements.schedulingAlgo.addEventListener('change', (e) => {
            this.sim.schedulingAlgorithm = e.target.value;
        });

        // Controls
        this.elements.btnStart.addEventListener('click', () => this.start());
        this.elements.btnPause.addEventListener('click', () => this.pause());
        this.elements.btnReset.addEventListener('click', () => this.reset());
        this.elements.btnSpawnUser.addEventListener('click', () => this.spawnUser());
        this.elements.btnTriggerIo.addEventListener('click', () => this.triggerIo());
    }

    updateConfigDisplay() {
        this.elements.valUserThreads.textContent = this.elements.numUserThreads.value;
        this.elements.valKernelThreads.textContent = this.elements.numKernelThreads.value;
        this.elements.valCpus.textContent = this.elements.numCpus.value;
    }

    getConfig() {
        return {
            numUserThreads: parseInt(this.elements.numUserThreads.value),
            numKernelThreads: parseInt(this.elements.numKernelThreads.value),
            numCPUs: parseInt(this.elements.numCpus.value)
        };
    }

    start() {
        if (!this.sim.isRunning) {
            if (this.sim.userThreads.length === 0) {
                this.sim.init(this.getConfig());
                this.sim.schedulingAlgorithm = this.elements.schedulingAlgo.value;
            }
            this.sim.isRunning = true;
            this.lastTime = performance.now();
            this.animationFrameId = requestAnimationFrame((t) => this.loop(t));

            this.elements.btnStart.disabled = true;
            this.elements.btnPause.disabled = false;
            this.elements.btnSpawnUser.disabled = false;
            this.elements.btnTriggerIo.disabled = false;

            this.elements.numUserThreads.disabled = true;
            this.elements.numKernelThreads.disabled = true;
            this.elements.numCpus.disabled = true;

            this.showToast('Simulation started');
        }
    }

    pause() {
        if (this.sim.isRunning) {
            this.sim.isRunning = false;
            cancelAnimationFrame(this.animationFrameId);

            this.elements.btnStart.disabled = false;
            this.elements.btnPause.disabled = true;
        }
    }

    reset() {
        this.pause();
        this.sim.init(this.getConfig());
        this.renderInitialState();
        this.updateMetrics();

        this.elements.btnStart.disabled = false;
        this.elements.btnPause.disabled = true;
        this.elements.btnSpawnUser.disabled = true;
        this.elements.btnTriggerIo.disabled = true;

        this.elements.numUserThreads.disabled = false;
        this.elements.numKernelThreads.disabled = false;
        this.elements.numCpus.disabled = false;

        this.showToast('Simulation reset');
    }

    spawnUser() {
        const ut = this.sim.spawnUserThread();
        this.showToast(`Spawned User Thread ${ut.id}`);
    }

    triggerIo() {
        const target = this.sim.triggerIOBlock();
        if (target) {
            this.showToast(`I/O Block triggered on ${target.id}`, 'warning');
        } else {
            this.showToast('No running thread to block', 'error');
        }
    }

    loop(timestamp) {
        if (!this.sim.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.sim.tick(deltaTime);
        this.renderState();
        this.updateMetrics();

        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    updateMetrics() {
        const metrics = this.sim.getMetrics();
        this.elements.cpuUtil.textContent = `${metrics.cpuUtil}%`;
        this.elements.ctxSwitches.textContent = metrics.contextSwitches;
        this.elements.throughput.textContent = `${metrics.throughput} t/s`;
        this.elements.simTime.textContent = metrics.simTime;
    }

    renderInitialState() {
        const config = this.getConfig();
        this.elements.userPool.innerHTML = '';
        this.elements.kernelPool.innerHTML = '';
        this.elements.cpuPool.innerHTML = '';

        for (let i = 0; i < config.numUserThreads; i++) {
            this.elements.userPool.appendChild(this.createUserNode(`U-${i + 1}`, THREAD_STATE.READY));
        }

        for (let i = 0; i < config.numKernelThreads; i++) {
            this.elements.kernelPool.appendChild(this.createKernelNode(`K-${i + 1}`, THREAD_STATE.READY));
        }

        for (let i = 0; i < config.numCPUs; i++) {
            this.elements.cpuPool.appendChild(this.createCpuNode(`CPU-${i + 1}`));
        }
    }

    createUserNode(id, state, progress = 0) {
        const el = document.createElement('div');
        el.className = `thread-node ${state}`;
        el.id = `node-${id}`;
        el.innerHTML = `
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            <span class="thread-id">${id}</span>
            <span class="thread-state">${state}</span>
        `;
        return el;
    }

    createKernelNode(id, state) {
        const el = document.createElement('div');
        el.className = `thread-node kernel-thread ${state}`;
        el.id = `node-${id}`;
        el.innerHTML = `
            <span class="thread-id">${id}</span>
            <span class="thread-state">${state}</span>
        `;
        return el;
    }

    createCpuNode(id) {
        const el = document.createElement('div');
        el.className = 'cpu-core';
        el.id = `node-${id}`;
        el.innerHTML = `
            <div class="cpu-icon">💻</div>
            <div class="cpu-label">${id}</div>
        `;
        return el;
    }

    renderState() {
        const state = this.sim.getState();

        // Update Users
        let activeUsers = 0;
        state.userThreads.forEach(ut => {
            let el = document.getElementById(`node-${ut.id}`);
            if (!el) {
                el = this.createUserNode(ut.id, ut.state, ut.progress);
                this.elements.userPool.appendChild(el);
            } else {
                el.className = `thread-node ${ut.state}`;
                el.querySelector('.thread-state').textContent = ut.state;
                el.querySelector('.progress-bar-fill').style.width = `${ut.progress}%`;
            }
            if (ut.state !== THREAD_STATE.COMPLETED) activeUsers++;
        });
        this.elements.statsUserSpace.textContent = `${activeUsers} active`;

        // Update Kernels
        let activeKernels = 0;
        state.kernelThreads.forEach(kt => {
            let el = document.getElementById(`node-${kt.id}`);
            if (el) {
                el.className = `thread-node kernel-thread ${kt.state}`;
                el.querySelector('.thread-state').textContent = kt.activeUserId ? `${kt.state} (${kt.activeUserId})` : kt.state;
            }
            if (kt.state !== THREAD_STATE.READY) activeKernels++;
        });
        this.elements.statsKernelSpace.textContent = `${activeKernels} active`;

        // Update CPUs
        state.cpus.forEach(cpu => {
            let el = document.getElementById(`node-${cpu.id}`);
            if (el) {
                if (cpu.activeKThreadId) {
                    el.classList.add('active');
                    let lbl = el.querySelector('.active-kthread-label');
                    if (!lbl) {
                        lbl = document.createElement('div');
                        lbl.className = 'active-kthread-label';
                        el.appendChild(lbl);
                    }
                    lbl.textContent = cpu.activeKThreadId;
                } else {
                    el.classList.remove('active');
                    let lbl = el.querySelector('.active-kthread-label');
                    if (lbl) el.removeChild(lbl);
                }
            }
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        if (type === 'warning') toast.style.borderLeftColor = 'var(--accent-warning)';
        if (type === 'error') toast.style.borderLeftColor = 'var(--accent-danger)';
        toast.textContent = message;

        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (this.elements.toastContainer.contains(toast)) {
                this.elements.toastContainer.removeChild(toast);
            }
        }, 3000);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});
