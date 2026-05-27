/* ==========================================================================
   Algoverse Pathfinding & Maze Engine
   ========================================================================== */

// Grid Sizing Configuration
const ROWS = 22;
const COLS = 50;

// Grid State Variables
let grid = [];
let startNode = { row: 5, col: 10 };
let targetNode = { row: 15, col: 40 };

// Interaction State Variables
let isMouseDown = false;
let isDraggingStart = false;
let isDraggingTarget = false;
let currentBrushMode = "wall"; // "wall" or "weight"
let isRunning = false;
let isSolved = false;
let activeAlgorithm = "astar";

// Speeds mapping (milliseconds per step)
const SPEED_MAP = {
  1: 80,  // Slow
  2: 30,  // Medium
  3: 8,   // Fast
  4: 0    // Instant (handled synchronously)
};
let currentSpeed = SPEED_MAP[3];

// Complexity & description dictionary
const ALGO_DATA = {
  astar: {
    name: "A* Search Algorithm",
    time: "O((V + E) log V)",
    space: "O(V)",
    desc: "A* (A-Star) is a heuristic-guided pathfinding algorithm. It estimates the distance to the target using a heuristic (Manhattan Distance), minimizing: <code>f(n) = g(n) + h(n)</code>. It guarantees the shortest path and is faster than Dijkstra in most cases."
  },
  dijkstra: {
    name: "Dijkstra's Algorithm",
    time: "O((V + E) log V)",
    space: "O(V)",
    desc: "Dijkstra's is a classic greedy algorithm for finding shortest paths in weighted graphs. It explores nodes strictly in order of their accumulated distance from start. It guarantees the shortest path."
  },
  bfs: {
    name: "Breadth-First Search (BFS)",
    time: "O(V + E)",
    space: "O(V)",
    desc: "BFS explores nodes layer-by-layer (wavefront ripple). It is optimal for unweighted graphs (guarantees shortest path in steps), but it cannot handle terrain weights (treats all costs as 1)."
  },
  dfs: {
    name: "Depth-First Search (DFS)",
    time: "O(V + E)",
    space: "O(V)",
    desc: "DFS explores as deep as possible along each branch before backtracking. It uses a stack structure. It does <strong>not</strong> guarantee the shortest path and can produce highly winding routes."
  }
};

/* ==========================================================================
   Priority Queue (Min-Heap) for A* & Dijkstra
   ========================================================================== */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  // Compare function considering f-scores, breaking ties with h-scores (heuristic to target)
  compare(a, b) {
    const scoreA = a.f !== undefined ? a.f : a.distance;
    const scoreB = b.f !== undefined ? b.f : b.distance;
    if (scoreA !== scoreB) {
      return scoreA < scoreB;
    }
    if (a.h !== undefined && b.h !== undefined) {
      return a.h < b.h;
    }
    return false;
  }

  bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      let parent = this.heap[parentIndex];
      if (this.compare(element, parent)) {
        this.heap[index] = parent;
        index = parentIndex;
      } else {
        break;
      }
    }
    this.heap[index] = element;
  }

  sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];

    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (this.compare(leftChild, element)) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        const compareTarget = swap === null ? element : leftChild;
        if (this.compare(rightChild, compareTarget)) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      index = swap;
    }
    this.heap[index] = element;
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

/* ==========================================================================
   Grid Initialization & Mouse Listeners
   ========================================================================== */
function initGrid() {
  const container = document.getElementById("grid-container");
  container.innerHTML = "";
  container.style.setProperty("--grid-rows", ROWS);
  container.style.setProperty("--grid-cols", COLS);
  grid = [];

  for (let r = 0; r < ROWS; r++) {
    const rowArray = [];
    for (let c = 0; c < COLS; c++) {
      const isStart = (r === startNode.row && c === startNode.col);
      const isTarget = (r === targetNode.row && c === targetNode.col);

      // Create DOM element
      const element = document.createElement("div");
      element.className = "node";
      element.id = `node-${r}-${c}`;
      
      // Node data structure
      const node = {
        row: r,
        col: c,
        isStart,
        isTarget,
        isWall: false,
        weight: 1, // weight cost (1 = default, 5 = weighted)
        isVisited: false,
        isPath: false,
        distance: Infinity,
        g: Infinity,
        h: Infinity,
        f: Infinity,
        previousNode: null,
        domElement: element
      };

      if (isStart) element.classList.add("node-start");
      if (isTarget) element.classList.add("node-target");

      // Event listeners for painting and dragging
      element.addEventListener("mousedown", (e) => handleMouseDown(node, e));
      element.addEventListener("mouseenter", () => handleMouseEnter(node));
      element.addEventListener("mouseup", () => handleMouseUp());

      container.appendChild(element);
      rowArray.push(node);
    }
    grid.push(rowArray);
  }
}

// Mouse Handlers
function handleMouseDown(node, event) {
  if (isRunning) return;
  event.preventDefault();
  isMouseDown = true;

  if (node.isStart) {
    isDraggingStart = true;
  } else if (node.isTarget) {
    isDraggingTarget = true;
  } else {
    toggleWallOrWeight(node);
  }
}

function handleMouseEnter(node) {
  if (!isMouseDown || isRunning) return;

  if (isDraggingStart) {
    if (node.isTarget || node.isWall) return;
    // Remove previous start classes & metadata
    grid[startNode.row][startNode.col].isStart = false;
    grid[startNode.row][startNode.col].domElement.classList.remove("node-start");
    
    startNode = { row: node.row, col: node.col };
    node.isStart = true;
    node.isWall = false;
    node.weight = 1;
    node.domElement.classList.remove("node-wall", "node-weight");
    node.domElement.classList.add("node-start");

    if (isSolved) triggerInstantRecalculate();
  } else if (isDraggingTarget) {
    if (node.isStart || node.isWall) return;
    // Remove previous target classes & metadata
    grid[targetNode.row][targetNode.col].isTarget = false;
    grid[targetNode.row][targetNode.col].domElement.classList.remove("node-target");
    
    targetNode = { row: node.row, col: node.col };
    node.isTarget = true;
    node.isWall = false;
    node.weight = 1;
    node.domElement.classList.remove("node-wall", "node-weight");
    node.domElement.classList.add("node-target");

    if (isSolved) triggerInstantRecalculate();
  } else {
    toggleWallOrWeight(node);
  }
}

function handleMouseUp() {
  isMouseDown = false;
  isDraggingStart = false;
  isDraggingTarget = false;
}

// Toggle Wall or Weight cost
function toggleWallOrWeight(node) {
  if (node.isStart || node.isTarget) return;

  if (currentBrushMode === "wall") {
    node.isWall = !node.isWall;
    node.weight = 1;
    node.domElement.classList.remove("node-weight");
    if (node.isWall) {
      node.domElement.classList.add("node-wall");
    } else {
      node.domElement.classList.remove("node-wall");
    }
  } else if (currentBrushMode === "weight") {
    node.isWall = false;
    node.domElement.classList.remove("node-wall");
    if (node.weight === 1) {
      node.weight = 5;
      node.domElement.classList.add("node-weight");
    } else {
      node.weight = 1;
      node.domElement.classList.remove("node-weight");
    }
  }

  // Clear solved path if modifications occur
  if (isSolved) {
    clearPathAndVisited();
  }
}

// Key listeners for keyboard shortcuts
window.addEventListener("keydown", (e) => {
  const presModal = document.getElementById("presentation-modal");
  if (presModal && !presModal.classList.contains("hidden")) {
    if (e.key === "ArrowRight") {
      if (currentSlide < TOTAL_SLIDES) {
        changeSlide(currentSlide + 1);
      } else {
        presModal.classList.add("hidden");
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      if (currentSlide > 1) {
        changeSlide(currentSlide - 1);
      }
      return;
    }
  }

  if (e.key === "w" || e.key === "W") {
    currentBrushMode = "weight";
    updateBrushButtons();
  }
  if (e.key === "c" || e.key === "C") {
    clearPathAndVisited();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W") {
    currentBrushMode = "wall";
    updateBrushButtons();
  }
});

function updateBrushButtons() {
  const btnWall = document.getElementById("brush-wall");
  const btnWeight = document.getElementById("brush-weight");
  if (currentBrushMode === "wall") {
    btnWall.classList.add("active");
    btnWeight.classList.remove("active");
  } else {
    btnWeight.classList.add("active");
    btnWall.classList.remove("active");
  }
}

/* ==========================================================================
   Grid Helper Utilities
   ========================================================================== */
function clearAll() {
  if (isRunning) return;
  isSolved = false;
  
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.isWall = false;
      node.weight = 1;
      node.isVisited = false;
      node.isPath = false;
      node.distance = Infinity;
      node.g = Infinity;
      node.h = Infinity;
      node.f = Infinity;
      node.previousNode = null;

      // Clean classes
      node.domElement.className = "node";
      if (node.isStart) node.domElement.classList.add("node-start");
      if (node.isTarget) node.domElement.classList.add("node-target");
    }
  }
  resetMetrics();
}

function clearPathAndVisited() {
  if (isRunning) return;
  isSolved = false;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.isVisited = false;
      node.isPath = false;
      node.distance = Infinity;
      node.g = Infinity;
      node.h = Infinity;
      node.f = Infinity;
      node.previousNode = null;

      node.domElement.classList.remove("node-visited", "node-visited-weight", "node-shortest-path", "node-path-weight");
    }
  }
  resetMetrics();
}

function resetMetrics() {
  document.getElementById("metric-time").innerHTML = `0 <span class="metric-unit">ms</span>`;
  document.getElementById("metric-visited").innerText = "0";
  document.getElementById("metric-length").innerHTML = `0 <span class="metric-unit">nodes</span>`;
  document.getElementById("metric-cost").innerText = "0";
}

function getNeighbors(node) {
  const neighbors = [];
  const { row, col } = node;

  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < COLS - 1) neighbors.push(grid[row][col + 1]);

  return neighbors.filter(neighbor => !neighbor.isWall);
}

// Manhattan distance heuristic
function getManhattanDistance(nodeA, nodeB) {
  return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

// Utility delay generator
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ==========================================================================
   Pathfinding Algorithms
   ========================================================================== */

// 1. A* Search
async function solveAStar(instant = false) {
  const start = grid[startNode.row][startNode.col];
  const target = grid[targetNode.row][targetNode.col];
  const visitedInOrder = [];

  start.distance = 0;
  start.g = 0;
  start.h = getManhattanDistance(start, target);
  start.f = start.g + start.h;

  const openSet = new MinHeap();
  openSet.push(start);

  while (!openSet.isEmpty()) {
    const current = openSet.pop();

    if (current.isVisited) continue;
    current.isVisited = true;
    visitedInOrder.push(current);

    if (current === target) break;

    // Trigger visual updates asynchronously or instantly
    if (!current.isStart && !current.isTarget) {
      if (!instant) {
        animateNodeVisited(current);
        await sleep(currentSpeed);
      }
    }

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      if (neighbor.isVisited) continue;

      const tentativeG = current.g + current.weight;
      if (tentativeG < neighbor.g) {
        neighbor.previousNode = current;
        neighbor.g = tentativeG;
        neighbor.h = getManhattanDistance(neighbor, target);
        neighbor.distance = tentativeG; // For visualization / metrics equivalence
        neighbor.f = neighbor.g + neighbor.h;
        openSet.push(neighbor);
      }
    }
  }
  return visitedInOrder;
}

// 2. Dijkstra's Algorithm
async function solveDijkstra(instant = false) {
  const start = grid[startNode.row][startNode.col];
  const target = grid[targetNode.row][targetNode.col];
  const visitedInOrder = [];

  start.distance = 0;
  const openSet = new MinHeap();
  openSet.push(start);

  while (!openSet.isEmpty()) {
    const current = openSet.pop();

    if (current.isVisited) continue;
    current.isVisited = true;
    visitedInOrder.push(current);

    if (current === target) break;

    if (!current.isStart && !current.isTarget) {
      if (!instant) {
        animateNodeVisited(current);
        await sleep(currentSpeed);
      }
    }

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      if (neighbor.isVisited) continue;

      const tentativeDistance = current.distance + neighbor.weight;
      if (tentativeDistance < neighbor.distance) {
        neighbor.distance = tentativeDistance;
        neighbor.previousNode = current;
        openSet.push(neighbor);
      }
    }
  }
  return visitedInOrder;
}

// 3. Breadth-First Search (BFS)
async function solveBFS(instant = false) {
  const start = grid[startNode.row][startNode.col];
  const target = grid[targetNode.row][targetNode.col];
  const visitedInOrder = [];

  const queue = [start];
  start.isVisited = true;
  start.distance = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    visitedInOrder.push(current);

    if (current === target) break;

    if (!current.isStart && !current.isTarget) {
      if (!instant) {
        animateNodeVisited(current);
        await sleep(currentSpeed);
      }
    }

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      if (!neighbor.isVisited) {
        // BFS ignores weights internally but metrics calculates total cost traversed
        neighbor.isVisited = true;
        neighbor.distance = current.distance + neighbor.weight;
        neighbor.previousNode = current;
        queue.push(neighbor);
      }
    }
  }
  return visitedInOrder;
}

// 4. Depth-First Search (DFS)
async function solveDFS(instant = false) {
  const start = grid[startNode.row][startNode.col];
  const target = grid[targetNode.row][targetNode.col];
  const visitedInOrder = [];

  const stack = [start];
  start.distance = 0;

  while (stack.length > 0) {
    const current = stack.pop();

    if (current.isVisited) continue;
    current.isVisited = true;
    visitedInOrder.push(current);

    if (current === target) break;

    if (!current.isStart && !current.isTarget) {
      if (!instant) {
        animateNodeVisited(current);
        await sleep(currentSpeed);
      }
    }

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      if (!neighbor.isVisited) {
        neighbor.distance = current.distance + neighbor.weight;
        neighbor.previousNode = current;
        stack.push(neighbor);
      }
    }
  }
  return visitedInOrder;
}

/* ==========================================================================
   Visual Animation Handlers
   ========================================================================== */
function animateNodeVisited(node) {
  if (node.weight > 1) {
    node.domElement.classList.add("node-visited-weight");
  } else {
    node.domElement.classList.add("node-visited");
  }
}

// Recovers shortest path backwards from target
function getShortestPathNodes() {
  const path = [];
  let current = grid[targetNode.row][targetNode.col];
  while (current !== null) {
    path.unshift(current);
    current = current.previousNode;
  }
  // If first node isn't start node, there is no path
  if (path[0] !== grid[startNode.row][startNode.col]) return [];
  return path;
}

// Draw paths
async function animateShortestPath(pathNodes, instant = false) {
  let cost = 0;
  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    cost += node.weight;

    if (!node.isStart && !node.isTarget) {
      if (node.weight > 1) {
        node.domElement.classList.add("node-path-weight");
      } else {
        node.domElement.classList.add("node-shortest-path");
      }
      if (!instant) await sleep(20);
    }
  }
  updateStatsMetrics(cost, pathNodes.length);
}

// Render instant runs (e.g. on dragging nodes post-solving)
function drawInstantVisualization(visitedNodes, pathNodes) {
  // Paint visited
  visitedNodes.forEach(node => {
    if (!node.isStart && !node.isTarget) {
      animateNodeVisited(node);
    }
  });

  // Paint path
  let cost = 0;
  pathNodes.forEach(node => {
    cost += node.weight;
    if (!node.isStart && !node.isTarget) {
      if (node.weight > 1) {
        node.domElement.classList.add("node-path-weight");
      } else {
        node.domElement.classList.add("node-shortest-path");
      }
    }
  });

  updateStatsMetrics(cost, pathNodes.length);
}

function updateStatsMetrics(cost, pathLength) {
  document.getElementById("metric-length").innerHTML = `${pathLength} <span class="metric-unit">nodes</span>`;
  document.getElementById("metric-cost").innerText = cost;
}

/* ==========================================================================
   Maze Generation Algorithms
   ========================================================================== */

// Entry maze function
async function generateMaze() {
  if (isRunning) return;
  isRunning = true;
  clearAll();

  const mazeType = document.getElementById("select-maze").value;

  if (mazeType === "random-wall") {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const node = grid[r][c];
        if (node.isStart || node.isTarget) continue;
        if (Math.random() < 0.3) {
          node.isWall = true;
          node.domElement.classList.add("node-wall");
        }
      }
    }
  } else if (mazeType === "random-weight") {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const node = grid[r][c];
        if (node.isStart || node.isTarget) continue;
        if (Math.random() < 0.25) {
          node.weight = 5;
          node.domElement.classList.add("node-weight");
        }
      }
    }
  } else if (mazeType === "recursive-division") {
    // Generate outer boundary walls first
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          const node = grid[r][c];
          if (!node.isStart && !node.isTarget) {
            node.isWall = true;
            node.domElement.classList.add("node-wall");
          }
        }
      }
    }
    // Divide internal region recursively
    await recursiveDivision(1, ROWS - 2, 1, COLS - 2, "horizontal");
  } else if (mazeType === "dfs-backtrack") {
    await dfsBacktrackMaze();
  }

  isRunning = false;
}

// 1. Recursive Division
async function recursiveDivision(rowStart, rowEnd, colStart, colEnd, orientation) {
  if (rowEnd < rowStart || colEnd < colStart) return;

  if (orientation === "horizontal") {
    // Choose index where to draw wall
    const possibleRows = [];
    for (let r = rowStart + 1; r < rowEnd; r += 2) {
      possibleRows.push(r);
    }
    if (possibleRows.length === 0) return;
    const rowVal = possibleRows[Math.floor(Math.random() * possibleRows.length)];

    // Choose random gap index
    const possibleCols = [];
    for (let c = colStart; c <= colEnd; c += 2) {
      possibleCols.push(c);
    }
    const gapCol = possibleCols[Math.floor(Math.random() * possibleCols.length)];

    for (let c = colStart; c <= colEnd; c++) {
      if (c === gapCol) continue;
      const node = grid[rowVal][c];
      if (node.isStart || node.isTarget) continue;
      node.isWall = true;
      node.domElement.classList.add("node-wall");
      await sleep(5);
    }

    // Recurse upper and lower divisions
    await recursiveDivision(rowStart, rowVal - 1, colStart, colEnd, chooseOrientation(rowVal - 1 - rowStart, colEnd - colStart));
    await recursiveDivision(rowVal + 1, rowEnd, colStart, colEnd, chooseOrientation(rowEnd - (rowVal + 1), colEnd - colStart));
  } else {
    // Vertical division
    const possibleCols = [];
    for (let c = colStart + 1; c < colEnd; c += 2) {
      possibleCols.push(c);
    }
    if (possibleCols.length === 0) return;
    const colVal = possibleCols[Math.floor(Math.random() * possibleCols.length)];

    const possibleRows = [];
    for (let r = rowStart; r <= rowEnd; r += 2) {
      possibleRows.push(r);
    }
    const gapRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];

    for (let r = rowStart; r <= rowEnd; r++) {
      if (r === gapRow) continue;
      const node = grid[r][colVal];
      if (node.isStart || node.isTarget) continue;
      node.isWall = true;
      node.domElement.classList.add("node-wall");
      await sleep(5);
    }

    // Recurse left and right divisions
    await recursiveDivision(rowStart, rowEnd, colStart, colVal - 1, chooseOrientation(rowEnd - rowStart, colVal - 1 - colStart));
    await recursiveDivision(rowStart, rowEnd, colVal + 1, colEnd, chooseOrientation(rowEnd - rowStart, colEnd - (colVal + 1)));
  }
}

function chooseOrientation(width, height) {
  if (width < height) return "horizontal";
  if (height < width) return "vertical";
  return Math.random() < 0.5 ? "horizontal" : "vertical";
}

// 2. Randomized DFS Maze Carver
async function dfsBacktrackMaze() {
  // First make everything a wall
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      if (!node.isStart && !node.isTarget) {
        node.isWall = true;
        node.domElement.classList.add("node-wall");
      }
    }
  }

  const stack = [];
  const startR = 1, startC = 1;
  grid[startR][startC].isWall = false;
  grid[startR][startC].domElement.classList.remove("node-wall");
  stack.push(grid[startR][startC]);

  const visitedMaze = new Set();
  visitedMaze.add(`${startR}-${startC}`);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    const dirs = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ];

    for (const [dr, dc] of dirs) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1) {
        if (!visitedMaze.has(`${nr}-${nc}`)) {
          neighbors.push(grid[nr][nc]);
        }
      }
    }

    if (neighbors.length > 0) {
      // Pick random neighbor
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      // Carve passage between current and next
      const wallR = current.row + (next.row - current.row) / 2;
      const wallC = current.col + (next.col - current.col) / 2;

      // Unwall next and intermediate wall
      next.isWall = false;
      next.domElement.classList.remove("node-wall");
      
      grid[wallR][wallC].isWall = false;
      grid[wallR][wallC].domElement.classList.remove("node-wall");

      visitedMaze.add(`${next.row}-${next.col}`);
      stack.push(next);
      await sleep(10);
    } else {
      stack.pop();
    }
  }

  // Ensure start & target nodes are clear of walls
  grid[startNode.row][startNode.col].isWall = false;
  grid[startNode.row][startNode.col].domElement.classList.remove("node-wall");
  grid[targetNode.row][targetNode.col].isWall = false;
  grid[targetNode.row][targetNode.col].domElement.classList.remove("node-wall");
}

/* ==========================================================================
   Control Actions & Coordination
   ========================================================================== */
async function triggerVisualization() {
  if (isRunning) return;
  isRunning = true;
  clearPathAndVisited();

  const algo = document.getElementById("select-algo").value;
  activeAlgorithm = algo;

  const tStart = performance.now();
  let visitedNodes = [];

  if (algo === "astar") {
    visitedNodes = await solveAStar(false);
  } else if (algo === "dijkstra") {
    visitedNodes = await solveDijkstra(false);
  } else if (algo === "bfs") {
    visitedNodes = await solveBFS(false);
  } else if (algo === "dfs") {
    visitedNodes = await solveDFS(false);
  }

  const tEnd = performance.now();
  const timeTaken = (tEnd - tStart).toFixed(1);
  
  // Set metrics
  document.getElementById("metric-time").innerHTML = `${timeTaken} <span class="metric-unit">ms</span>`;
  document.getElementById("metric-visited").innerText = visitedNodes.length;

  const pathNodes = getShortestPathNodes();
  await animateShortestPath(pathNodes, false);

  isRunning = false;
  isSolved = true;
}

// Instant recalculation on Node dragging
function triggerInstantRecalculate() {
  // Clear path structures synchronously
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.isVisited = false;
      node.isPath = false;
      node.distance = Infinity;
      node.g = Infinity;
      node.h = Infinity;
      node.f = Infinity;
      node.previousNode = null;
      node.domElement.classList.remove("node-visited", "node-visited-weight", "node-shortest-path", "node-path-weight");
    }
  }

  const algo = activeAlgorithm;
  let visitedNodes = [];

  // Run searches synchronously (instant = true)
  if (algo === "astar") {
    solveAStar(true);
  } else if (algo === "dijkstra") {
    solveDijkstra(true);
  } else if (algo === "bfs") {
    solveBFS(true);
  } else if (algo === "dfs") {
    solveDFS(true);
  }

  const pathNodes = getShortestPathNodes();
  
  // Paint DOM instantly
  // Filter visited nodes
  const visitedArray = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].isVisited) visitedArray.push(grid[r][c]);
    }
  }

  drawInstantVisualization(visitedArray, pathNodes);
  document.getElementById("metric-visited").innerText = visitedArray.length;
}

// UI State Updates
function updateAlgoExplanation() {
  const select = document.getElementById("select-algo");
  const data = ALGO_DATA[select.value];
  if (!data) return;

  document.getElementById("info-algo-name").innerText = data.name;
  document.getElementById("info-time-complexity").innerText = data.time;
  document.getElementById("info-space-complexity").innerText = data.space;
  document.getElementById("info-algo-desc").innerHTML = data.desc;
}

/* ==========================================================================
   Presentation Slides Controllers
   ========================================================================== */
let currentSlide = 1;
const TOTAL_SLIDES = 8;

function initPresentation() {
  const dotsContainer = document.querySelector(".slide-dots");
  dotsContainer.innerHTML = "";

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const dot = document.createElement("div");
    dot.className = `slide-dot ${i === 1 ? 'active' : ''}`;
    dot.addEventListener("click", () => changeSlide(i));
    dotsContainer.appendChild(dot);
  }

  document.getElementById("slide-prev").addEventListener("click", () => {
    if (currentSlide > 1) {
      changeSlide(currentSlide - 1);
    }
  });

  document.getElementById("slide-next").addEventListener("click", () => {
    if (currentSlide < TOTAL_SLIDES) {
      changeSlide(currentSlide + 1);
    } else {
      document.getElementById("presentation-modal").classList.add("hidden");
    }
  });

  document.getElementById("presentation-close").addEventListener("click", () => {
    document.getElementById("presentation-modal").classList.add("hidden");
  });

  document.getElementById("btn-presentation").addEventListener("click", () => {
    document.getElementById("presentation-modal").classList.remove("hidden");
    changeSlide(1);
  });
}

function changeSlide(slideNum) {
  currentSlide = slideNum;

  const slides = document.querySelectorAll(".slide");
  slides.forEach(slide => {
    if (parseInt(slide.getAttribute("data-slide")) === slideNum) {
      slide.classList.add("slide-active");
    } else {
      slide.classList.remove("slide-active");
    }
  });

  const dots = document.querySelectorAll(".slide-dot");
  dots.forEach((dot, index) => {
    if (index + 1 === slideNum) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  const btnPrev = document.getElementById("slide-prev");
  const btnNext = document.getElementById("slide-next");

  btnPrev.style.visibility = slideNum === 1 ? "hidden" : "visible";
  btnNext.innerText = slideNum === TOTAL_SLIDES ? "Finish" : "Next →";
}

/* ==========================================================================
   Page Initialize & DOM Bindings
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initGrid();
  updateAlgoExplanation();
  initPresentation();

  // Control Listeners
  document.getElementById("btn-run").addEventListener("click", triggerVisualization);
  document.getElementById("btn-clear-all").addEventListener("click", clearAll);
  document.getElementById("btn-clear-path").addEventListener("click", clearPathAndVisited);
  document.getElementById("btn-generate-maze").addEventListener("click", generateMaze);

  // Selector update Explanation text
  document.getElementById("select-algo").addEventListener("change", (e) => {
    activeAlgorithm = e.target.value;
    updateAlgoExplanation();
    if (isSolved) {
      triggerInstantRecalculate();
    }
  });

  // Brush toggles
  document.getElementById("brush-wall").addEventListener("click", () => {
    currentBrushMode = "wall";
    updateBrushButtons();
  });
  document.getElementById("brush-weight").addEventListener("click", () => {
    currentBrushMode = "weight";
    updateBrushButtons();
  });

  // Speed Slider
  const slider = document.getElementById("speed-slider");
  slider.addEventListener("input", (e) => {
    currentSpeed = SPEED_MAP[parseInt(e.target.value)];
  });

  // Modal Tutorial Handlers
  const modal = document.getElementById("tutorial-modal");
  document.getElementById("btn-tutorial").addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
  document.getElementById("modal-close").addEventListener("click", () => {
    modal.classList.add("hidden");
  });
  document.getElementById("modal-btn-start").addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Display tutorial modal initially on first load
  setTimeout(() => {
    modal.classList.remove("hidden");
  }, 500);
});
