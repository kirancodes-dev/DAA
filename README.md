# Algoverse: Interactive Pathfinding & Maze Engine

An interactive, real-time sandbox engine designed to visualize, analyze, and compare classic graph traversal and heuristic search algorithms. Built with vanilla HTML5, modern CSS3 variables/animations, and ES6+ JavaScript.

🌌 **Live Sandbox Visualizer & Presentation Deck**

---

## 🚀 Key Features

1. **Pathfinding Solvers**:
   - **A* Search**: Optimal heuristic-guided solver using Manhattan distances and customized binary heap sorting.
   - **Dijkstra's Algorithm**: Concentric uniform cost weighted explorer.
   - **Breadth-First Search (BFS)**: Unweighted wavefront solver. Optimal for step counts.
   - **Depth-First Search (DFS)**: Stack-based explorer. Winding paths.

2. **Maze & Terrain Engineering**:
   - **Recursive Division**: Generates organized grids and hallways recursively.
   - **Randomized DFS Carver**: Carves winding, single-solution labyrinths.
   - **Random Noise**: Randomly scatters walls or weighted swamp node pools.

3. **Interactive UI Sandbox**:
   - **Paintbrushes**: Click and drag to paint Walls or weighted Swamps (cost of 5).
   - **Instant Recalculation**: Drag start/target nodes after solving to watch paths warp dynamically in 0ms.
   - **Diagnostics Board**: Real-time trackers for Time (ms), Visited Nodes, Path Length, and Path Cost.
   - **🎓 Presentation Slides View**: An 8-slide presentation built directly into the website with a logo on the top right, customizable student name inputs, and Left/Right keyboard arrow navigation.

---

## 📋 Algorithm Complexity Profile

| Algorithm | Time Complexity | Space Complexity | Path Optimality |
| :--- | :--- | :--- | :--- |
| **A\* Search** | $O((V + E) \log V)$ | $O(V)$ | Yes (Guaranteed) |
| **Dijkstra's** | $O((V + E) \log V)$ | $O(V)$ | Yes (Guaranteed) |
| **BFS** | $O(V + E)$ | $O(V)$ | Yes (Unweighted steps) |
| **DFS** | $O(V + E)$ | $O(V)$ | No |

---

## 🛠️ Step-by-Step Flowchart

```mermaid
flowchart TD
    Start([1. Start Visualization]) --> Init[2. Reset Grid Node Costs & Parent pointers]
    Init --> QueueStart[3. Push Start Node into Queue / Stack]
    QueueStart --> LoopStart{4. Is Queue/Stack Empty?}
    
    LoopStart -- Yes --> NoPath([No Path Found - End])
    LoopStart -- No --> PopNode[5. Pop Current Node from Queue/Stack]
    
    PopNode --> VisitedCheck{6. Node already Visited?}
    VisitedCheck -- Yes --> LoopStart
    VisitedCheck -- No --> MarkVisited[7. Mark Node as Visited & Draw Ripple animation]
    
    MarkVisited --> TargetCheck{8. Is Node the Target?}
    TargetCheck -- Yes --> TracePath[9. Trace Shortest Path back using Parent pointers]
    TracePath --> DrawPath([Draw Cyan Path - End])
    
    TargetCheck -- No --> GetNeighbors[10. Fetch unvisited non-wall Neighbors]
    GetNeighbors --> ForEachNeighbor{11. For each Neighbor}
    
    ForEachNeighbor -- Process --> CalculateCost[12. Calculate tentative travel cost]
    CalculateCost --> BetterPath{13. Cost < existing neighbor distance?}
    BetterPath -- Yes --> UpdateNeighbor[14. Set Neighbor parent = Current Node <br> Update neighbor distance/f-score]
    UpdateNeighbor --> PushQueue[15. Push Neighbor into Queue/Stack]
    PushQueue --> ForEachNeighbor
    BetterPath -- No --> ForEachNeighbor
    
    ForEachNeighbor -- Finished --> LoopStart
```

---

## 💻 Local Setup & Execution

Since the project is built with zero framework dependencies, running it is simple:

1. Clone this repository:
   ```bash
   git clone https://github.com/kirancodes-dev/DAA.git
   ```
2. Open the directory:
   ```bash
   cd DAA
   ```
3. Open `index.html` directly in your browser, or spin up a simple server:
   ```bash
   # Using Python
   python3 -m http.server 8123
   
   # Using Node.js
   npx http-server -p 8123
   ```
4. Access the web app at `http://localhost:8123`.
