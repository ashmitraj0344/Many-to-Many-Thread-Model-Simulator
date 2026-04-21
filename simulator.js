// Defines the core simulation logic for Many-to-Many OS Thread Mapping

export const THREAD_STATE = {
    READY: 'ready',
    RUNNING: 'running',
    BLOCKED: 'blocked',
    COMPLETED: 'completed'
};

class Thread {
    constructor(id, totalWork) {
        this.id = id;
        this.state = THREAD_STATE.READY;
        this.totalWork = totalWork;
        this.workDone = 0;
    }
    
    get progress() {
        return (this.workDone / this.totalWork) * 100;
    }

    isFinished() {
        return this.workDone >= this.totalWork;
    }
}

export class UserThread extends Thread {
    constructor(id, totalWork) {
        super(`U-${id}`, totalWork);
        this.assignedKThread = null;
        this.blockTimer = 0; // If > 0, thread is blocked
    }
}

export class KernelThread extends Thread {
    constructor(id) {
        super(`K-${id}`, Infinity); // Kernel threads run loop 'infinitely'
        this.activeUserThread = null; // Currently mapped user thread
        this.userThreadQueue = []; // M:N queuing
        this.assignedCPU = null;
        this.blockTimer = 0; // Kernel thread blocked if underlying user thread is I/O blocked
    }
}

export class CPUCore {
    constructor(id) {
        this.id = `CPU-${id}`;
        this.activeKThread = null;
    }
}

export class Simulator {
    constructor() {
        this.userThreads = [];
        this.kernelThreads = [];
        this.cpus = [];
        
        // Metrics
        this.metrics = {
            simTime: 0,
            contextSwitches: 0,
            completedTasks: 0,
            totalWorkDone: 0,       // to compute CPU utilization
            cpuActiveTicks: 0,      // ticks where CPUs were busy
            totalCPUTicks: 0        // total possible CPU ticks
        };

        this.isRunning = false;
        this.speedMultiplier = 1; // 1x to 100x
        this.schedulingAlgorithm = 'rr'; // 'rr' or 'fcfs'
        this.quantum = 50; // for RR scheduling
        this.currentTick = 0;
    }

    init(config) {
        this.userThreads = [];
        this.kernelThreads = [];
        this.cpus = [];
        
        // Initialize User Threads
        for (let i = 0; i < config.numUserThreads; i++) {
            this.spawnUserThread(i + 1);
        }

        // Initialize Kernel Threads (N)
        for (let i = 0; i < config.numKernelThreads; i++) {
            this.kernelThreads.push(new KernelThread(i + 1));
        }

        // Initialize CPU Cores
        for (let i = 0; i < config.numCPUs; i++) {
            this.cpus.push(new CPUCore(i + 1));
        }

        // Metrics reset
        this.metrics = {
            simTime: 0, contextSwitches: 0, completedTasks: 0,
            totalWorkDone: 0, cpuActiveTicks: 0, totalCPUTicks: 0
        };
        this.currentTick = 0;
    }

    spawnUserThread(idOverride = null) {
        const id = idOverride || (this.userThreads.length + 1);
        const work = 200 + Math.floor(Math.random() * 500); // Random work
        const ut = new UserThread(id, work);
        this.userThreads.push(ut);
        return ut;
    }

    triggerIOBlock() {
        // Find a running user thread
        const runningUTs = this.userThreads.filter(t => t.state === THREAD_STATE.RUNNING);
        if (runningUTs.length === 0) return null;
        
        const target = runningUTs[Math.floor(Math.random() * runningUTs.length)];
        target.state = THREAD_STATE.BLOCKED;
        target.blockTimer = 150; // Block for 150 ticks
        
        if (target.assignedKThread) {
            target.assignedKThread.state = THREAD_STATE.BLOCKED;
            target.assignedKThread.blockTimer = 150; // In M:N, if user blocks, kernel might block if no other user threads can run or if strict mapping
            // Note: True M:N might context switch user thread and keep kernel thread running. 
            // We simulate that the kernel thread is blocked momentarily or swaps.
            // Let's swap out the user thread from the kernel thread if blocked
            const kt = target.assignedKThread;
            kt.activeUserThread = null;
            kt.state = THREAD_STATE.READY;
            target.assignedKThread = null;
            this.metrics.contextSwitches++;
        }
        return target;
    }

    tick(deltaTime) {
        if (!this.isRunning) return;

        const effectiveDelta = deltaTime * this.speedMultiplier;
        this.currentTick += effectiveDelta;
        this.metrics.simTime += (effectiveDelta / 1000);

        // 1. Process Blocked Threads
        this.userThreads.forEach(ut => {
            if (ut.state === THREAD_STATE.BLOCKED) {
                ut.blockTimer -= effectiveDelta;
                if (ut.blockTimer <= 0) {
                    ut.state = THREAD_STATE.READY;
                    ut.blockTimer = 0;
                }
            }
        });

        // 2. Map Ready User Threads to Kernel Threads (Lightweight Scheduler)
        let readyUsers = this.userThreads.filter(t => t.state === THREAD_STATE.READY && !t.assignedKThread);
        
        for (let ut of readyUsers) {
            // Find a kernel thread with least load (shortest queue)
            let bestKT = this.kernelThreads.reduce((prev, curr) => 
                (prev.userThreadQueue.length < curr.userThreadQueue.length) ? prev : curr
            );
            bestKT.userThreadQueue.push(ut);
            ut.assignedKThread = bestKT;
        }

        // 3. Map Kernel Threads to CPUs (OS Scheduler)
        let activeCpus = 0;
        
        // Free CPUs from BLOCKED kernel threads
        this.cpus.forEach(cpu => {
             if (cpu.activeKThread && cpu.activeKThread.state !== THREAD_STATE.RUNNING) {
                 cpu.activeKThread.assignedCPU = null;
                 cpu.activeKThread = null;
             }
        });

        const readyKTs = this.kernelThreads.filter(t => t.state === THREAD_STATE.READY);
        
        for (let kt of readyKTs) {
            if (kt.assignedCPU) continue;
            let freeCpu = this.cpus.find(c => c.activeKThread === null);
            if (freeCpu) {
                freeCpu.activeKThread = kt;
                kt.assignedCPU = freeCpu;
                kt.state = THREAD_STATE.RUNNING;
                this.metrics.contextSwitches++;
            }
        }

        // 4. Execution Phase
        this.cpus.forEach(cpu => {
            this.metrics.totalCPUTicks += effectiveDelta;
            if (cpu.activeKThread) {
                let kt = cpu.activeKThread;
                activeCpus++;
                
                // M:N multiplexing: KT executes its user threads
                if (!kt.activeUserThread) {
                    if (kt.userThreadQueue.length > 0) {
                        kt.activeUserThread = kt.userThreadQueue.shift();
                        kt.activeUserThread.state = THREAD_STATE.RUNNING;
                    } else {
                        // CPU idle, kernel thread has no user threads
                        kt.state = THREAD_STATE.READY;
                        cpu.activeKThread = null;
                        kt.assignedCPU = null;
                        return;
                    }
                }

                let ut = kt.activeUserThread;
                if (ut && ut.state === THREAD_STATE.RUNNING) {
                    ut.workDone += (effectiveDelta * 0.5); // Adjust execution speed
                    this.metrics.totalWorkDone += (effectiveDelta * 0.5);
                    this.metrics.cpuActiveTicks += effectiveDelta;
                    
                    // Preemption (Round Robin)
                    if (this.schedulingAlgorithm === 'rr' && this.currentTick % this.quantum < effectiveDelta) {
                         if (!ut.isFinished() && kt.userThreadQueue.length > 0) {
                             ut.state = THREAD_STATE.READY;
                             kt.userThreadQueue.push(ut);
                             kt.activeUserThread = null; // context switch out user thread
                             this.metrics.contextSwitches++;
                         }
                    }

                    if (ut.isFinished()) {
                        ut.state = THREAD_STATE.COMPLETED;
                        ut.workDone = ut.totalWork;
                        kt.activeUserThread = null; // free up kt
                        this.metrics.completedTasks++;
                        // unassign KThread
                        ut.assignedKThread = null;
                    }
                }
            }
        });
    }

    getMetrics() {
        const util = this.metrics.totalCPUTicks > 0 
            ? ((this.metrics.cpuActiveTicks / this.metrics.totalCPUTicks) * 100).toFixed(1) 
            : 0;
            
        const throughput = this.metrics.simTime > 0 
            ? (this.metrics.completedTasks / this.metrics.simTime).toFixed(2)
            : 0;

        return {
            simTime: this.metrics.simTime.toFixed(1) + 's',
            contextSwitches: this.metrics.contextSwitches,
            throughput: throughput,
            cpuUtil: util
        };
    }

    getState() {
        return {
            userThreads: this.userThreads.map(t => ({
                id: t.id,
                state: t.state,
                progress: t.progress,
                kThreadId: t.assignedKThread ? t.assignedKThread.id : null
            })),
            kernelThreads: this.kernelThreads.map(t => ({
                id: t.id,
                state: t.state,
                activeUserId: t.activeUserThread ? t.activeUserThread.id : null,
                queueLength: t.userThreadQueue.length,
                cpuId: t.assignedCPU ? t.assignedCPU.id : null
            })),
            cpus: this.cpus.map(c => ({
                id: c.id,
                activeKThreadId: c.activeKThread ? c.activeKThread.id : null
            }))
        };
    }
}
