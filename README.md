# Many-to-Many OS Thread Scheduler Simulator

## Overview

This project is an interactive **Many-to-Many (M:N) Thread Model Simulator** built to demonstrate how modern operating systems efficiently manage concurrency. It provides a real-time visualization of thread scheduling, bridging the gap between user space, kernel space, and actual hardware execution.

It visualizes how:
- **Multiple User Threads (M)** are created and managed by a thread library.
- They are mapped to **multiple Kernel Threads (N)**.
- Kernel threads are subsequently scheduled and executed on available **CPU cores**.

The simulator features a responsive UI and a robust frontend simulation engine, making it ideal for:
- 📚 Operating System learning
- 🎓 College projects & vivas
- 🧠 Understanding thread scheduling, context switching, and concurrency

## Features

- **Real-Time Visualization:** Watch user threads transition between states (Ready, Running, Blocked, Completed) and get mapped to kernel threads and CPU cores.
- **Dynamic Configuration:**
  - Adjust the number of **User Threads (M)**, **Kernel Threads (N)**, and **CPU Cores**.
  - Adjust simulation speed on the fly.
- **Scheduling Algorithms:** Supports switching between:
  - Round Robin (RR)
  - First Come First Serve (FCFS)
- **Interactive Scenarios:**
  - Manually spawn new user threads during execution.
  - Trigger I/O blocks randomly to simulate real-world blocking operations.
- **Live Metrics Dashboard:** Tracks simulation time, CPU utilization, context switches, and throughput.

## Core Concepts Demonstrated

- **Many-to-Many Thread Model (M:N)**
- **User-Level Threads vs. Kernel-Level Threads**
- **CPU Scheduling Algorithms** (RR, FCFS)
- **Context Switching**
- **Thread Lifecycles (Ready, Running, Blocked, Completed)**
- **Concurrency & Parallelism**
- **I/O Blocking & Unblocking**

## Technologies Used

- **HTML5:** Semantic structure for the layout.
- **CSS3:** Advanced styling, flexbox/grid layouts, dynamic animations, and custom UI components.
- **JavaScript (ES6 Modules):**
  - `simulator.js`: Handles the core engine logic, thread lifecycles, state management, and scheduling algorithms.
  - `ui.js`: Manages DOM manipulation, event listeners, dynamic visualizations, and live metrics updates.

## How to Run

Since this is a vanilla frontend project, no complex server setup is required.

1. Clone or download the repository.
2. Open `index.html` in any modern web browser (e.g., Chrome, Edge, Firefox, Safari).
3. Alternatively, you can use a local server like VS Code's "Live Server" extension for a better development experience.

## Usage Guide

1. **Configure Parameters:** Use the sliders on the left panel to set the desired number of User Threads, Kernel Threads, and CPU Cores before starting.
2. **Select Scheduling Algorithm:** Choose either Round Robin (RR) or First Come First Serve (FCFS) for the kernel space scheduling.
3. **Control Simulation:** Use the **Start**, **Pause**, and **Reset** buttons to control the flow.
4. **Interact:** While the simulation is running, try spawning a new user thread or triggering an I/O block to observe how the scheduler dynamically reacts.
5. **Observe Metrics:** Keep an eye on the top metrics bar to see how different configurations and workloads affect CPU Utilization and Throughput.

## License

This project is open-source and available for educational and personal use. Feel free to modify and adapt it for your own assignments or learning.
