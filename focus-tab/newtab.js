// --- CLOCK & POMODORO LOGIC ---
let timerInterval; let isTimerMode = false; let timeLeft = 0;
const timeDisplay = document.getElementById('time-display');
const dateDisplay = document.getElementById('date-display');
const tabs = document.querySelectorAll('.tab');

function updateClock() {
    if (isTimerMode) return;
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    dateDisplay.textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}
setInterval(updateClock, 1000); updateClock();

function startTimer(minutes) {
    clearInterval(timerInterval); isTimerMode = true; timeLeft = minutes * 60; updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--; updateTimerDisplay();
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);
}
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
}
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active')); e.target.classList.add('active');
        const mode = e.target.getAttribute('data-target');
        if (mode === 'clock') { isTimerMode = false; clearInterval(timerInterval); updateClock(); } 
        else if (mode === 'focus') { startTimer(25); } 
        else if (mode === 'short-break') { startTimer(5); } 
        else if (mode === 'long-break') { startTimer(15); }
    });
});

// --- DOCK SHORTCUT LOGIC ---
const dockItemsContainer = document.getElementById('dock-items');
const modal = document.getElementById('shortcut-modal');
const nameInput = document.getElementById('shortcut-name');
const urlInput = document.getElementById('shortcut-url');

function loadShortcuts() {
    chrome.storage.local.get(['shortcuts'], function(result) {
        const shortcuts = result.shortcuts || [{ name: 'GH', url: 'https://github.com' }, { name: 'YT', url: 'https://youtube.com' }];
        dockItemsContainer.innerHTML = '';
        shortcuts.forEach((sc, index) => {
            const el = document.createElement('a');
            el.href = sc.url; el.className = 'dock-item'; el.textContent = sc.name; el.title = sc.url;
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                if(confirm(`Delete shortcut for ${sc.name}?`)) {
                    shortcuts.splice(index, 1);
                    chrome.storage.local.set({ shortcuts: shortcuts }, loadShortcuts);
                }
            });
            dockItemsContainer.appendChild(el);
        });
    });
}
document.getElementById('add-shortcut-btn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('save-shortcut').addEventListener('click', () => {
    const name = nameInput.value.toUpperCase(); let url = urlInput.value;
    if (url && !url.startsWith('http')) url = 'https://' + url;
    if (name && url) {
        chrome.storage.local.get(['shortcuts'], function(result) {
            const shortcuts = result.shortcuts || [];
            shortcuts.push({ name: name, url: url });
            chrome.storage.local.set({ shortcuts: shortcuts }, () => {
                modal.classList.add('hidden'); nameInput.value = ''; urlInput.value = ''; loadShortcuts();
            });
        });
    }
});

// --- CUSTOM KANBAN BOARD LOGIC ---
const boardsContainer = document.getElementById('boards-container');

// A default setup reflecting your data
const defaultBoards = [
    { id: 'b1', title: 'Develop', tasks: [{ id: 't1', text: 'C++', completed: false }, { id: 't2', text: 'SANJI focus guardian', completed: false }] },
    { id: 'b2', title: 'ASSIGNED', tasks: [{ id: 't3', text: 'Matlab test', completed: false }, { id: 't4', text: 'LTspice assignment', completed: false }] },
    { id: 'b3', title: 'WORKING', tasks: [] },
    { id: 'b4', title: 'Events', tasks: [{ id: 't5', text: 'Bharatiya Antariksh Hackathon presentation', completed: false }] },
    { id: 'b5', title: 'PERSONAL', tasks: [{ id: 't6', text: 'Gym session at Cult', completed: false }] }
];

function loadBoards() {
    chrome.storage.local.get(['boards'], function(result) {
        // Use saved boards, or initialize with defaults if none exist
        const boards = result.boards || defaultBoards; 
        boardsContainer.innerHTML = '';
        
        boards.forEach((board, boardIndex) => {
            const boardDiv = document.createElement('div');
            boardDiv.className = 'board';
            
            // Build tasks HTML
            let tasksHtml = '';
            board.tasks.forEach((task, taskIndex) => {
                const isComp = task.completed ? 'completed' : '';
                tasksHtml += `
                    <div class="task-item ${isComp}">
                        <button class="circle-btn toggle-task" data-bidx="${boardIndex}" data-tidx="${taskIndex}"></button>
                        <span class="task-text">${task.text}</span>
                        <button class="delete-task-btn" data-bidx="${boardIndex}" data-tidx="${taskIndex}" title="Delete Task">✕</button>
                    </div>
                `;
            });

            boardDiv.innerHTML = `
                <div class="board-header">
                    <span>${board.title}</span>
                    <button class="delete-board-btn" data-bidx="${boardIndex}" title="Delete List">⋮</button>
                </div>
                <button class="add-task-btn" data-bidx="${boardIndex}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Add a task
                </button>
                <div class="task-list">
                    ${tasksHtml}
                </div>
            `;
            boardsContainer.appendChild(boardDiv);
        });
        
        // Save back to storage just in case we used defaults
        chrome.storage.local.set({ boards: boards });
    });
}

// Add a brand new List/Category
document.getElementById('add-board-btn').addEventListener('click', () => {
    const title = prompt("Enter new list category (e.g. Develop, Assigned):");
    if (title) {
        chrome.storage.local.get(['boards'], function(result) {
            const boards = result.boards || defaultBoards;
            boards.push({ id: Date.now().toString(), title: title, tasks: [] });
            chrome.storage.local.set({ boards: boards }, loadBoards);
        });
    }
});

// Event Delegation for dynamically created buttons (Manifest V3 Safe)
boardsContainer.addEventListener('click', (e) => {
    
    // 1. Add Task Button
    const addBtn = e.target.closest('.add-task-btn');
    if (addBtn) {
        const boardIndex = addBtn.getAttribute('data-bidx');
        const text = prompt("Enter new task:");
        if (text) {
            chrome.storage.local.get(['boards'], function(result) {
                const boards = result.boards;
                boards[boardIndex].tasks.push({ id: Date.now().toString(), text: text, completed: false });
                chrome.storage.local.set({ boards: boards }, loadBoards);
            });
        }
        return;
    }

    // 2. Toggle Task Completion (Circle Button)
    if (e.target.classList.contains('toggle-task')) {
        const bIdx = e.target.getAttribute('data-bidx');
        const tIdx = e.target.getAttribute('data-tidx');
        chrome.storage.local.get(['boards'], function(result) {
            const boards = result.boards;
            boards[bIdx].tasks[tIdx].completed = !boards[bIdx].tasks[tIdx].completed;
            chrome.storage.local.set({ boards: boards }, loadBoards);
        });
        return;
    }

    // 3. Delete Task Button
    if (e.target.classList.contains('delete-task-btn')) {
        const bIdx = e.target.getAttribute('data-bidx');
        const tIdx = e.target.getAttribute('data-tidx');
        if (confirm("Delete this task?")) {
            chrome.storage.local.get(['boards'], function(result) {
                const boards = result.boards;
                boards[bIdx].tasks.splice(tIdx, 1);
                chrome.storage.local.set({ boards: boards }, loadBoards);
            });
        }
        return;
    }

    // 4. Delete Board Button (Three dots)
    if (e.target.classList.contains('delete-board-btn')) {
        const bIdx = e.target.getAttribute('data-bidx');
        if (confirm("Delete this entire list and all its tasks?")) {
            chrome.storage.local.get(['boards'], function(result) {
                const boards = result.boards;
                boards.splice(bIdx, 1);
                chrome.storage.local.set({ boards: boards }, loadBoards);
            });
        }
        return;
    }
});

// Initialize
loadShortcuts();
loadBoards();