import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  ClipboardList,
  Copy,
  Download,
  Clock3,
  ListTodo,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import WeatherCard from './WeatherCard'
import './App.css'

const TASKS_KEY = 'taskflow-tasks'
const THEME_KEY = 'taskflow-theme'

const emptyTask = { title: '', priority: 'med', status: 'todo', dueDate: '' }

function readStoredTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (task) =>
        task &&
        typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        ['low', 'med', 'high'].includes(task.priority) &&
        ['todo', 'doing', 'done'].includes(task.status),
    )
  } catch {
    return []
  }
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function formatDate(date) {
  if (!date) return 'No due date'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function App() {
  const [tasks, setTasks] = useState(readStoredTasks)
  const [theme, setTheme] = useState(readStoredTheme)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [newTask, setNewTask] = useState(emptyTask)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('due')
  const [dateScope, setDateScope] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [recentlyDeleted, setRecentlyDeleted] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    } catch {
      // Keep the dashboard usable when storage is unavailable or full.
    }
  }, [tasks])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // The selected theme still applies for this session.
    }
  }, [theme])

  useEffect(() => {
    if (!recentlyDeleted) return undefined
    const timer = window.setTimeout(() => setRecentlyDeleted(null), 7000)
    return () => window.clearTimeout(timer)
  }, [recentlyDeleted])

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      const matchesSearch = !query || task.title.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const isOpen = task.status !== 'done'
      const matchesDate = dateScope === 'all'
        || (dateScope === 'today' && task.dueDate === todayKey)
        || (dateScope === 'upcoming' && isOpen && task.dueDate > todayKey)
        || (dateScope === 'overdue' && isOpen && task.dueDate && task.dueDate < todayKey)
      return matchesSearch && matchesStatus && matchesPriority && matchesDate
    })
    const priorityRank = { high: 0, med: 1, low: 2 }
    return filtered.sort((first, second) => {
      if (sortBy === 'priority') return priorityRank[first.priority] - priorityRank[second.priority]
      if (sortBy === 'title') return first.title.localeCompare(second.title)
      if (!first.dueDate) return second.dueDate ? 1 : 0
      if (!second.dueDate) return -1
      return first.dueDate.localeCompare(second.dueDate)
    })
  }, [tasks, search, statusFilter, priorityFilter, sortBy, dateScope, todayKey])

  const completedCount = tasks.filter((task) => task.status === 'done').length
  const completionPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const dueTodayCount = tasks.filter((task) => task.dueDate === todayKey && task.status !== 'done').length
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const metrics = [
    { label: 'Total', value: tasks.length, icon: ListTodo, tone: 'violet' },
    { label: 'Todo', value: tasks.filter((task) => task.status === 'todo').length, icon: Circle, tone: 'amber' },
    { label: 'Doing', value: tasks.filter((task) => task.status === 'doing').length, icon: Clock3, tone: 'blue' },
    { label: 'Done', value: tasks.filter((task) => task.status === 'done').length, icon: CheckCheck, tone: 'green' },
  ]
  const dateScopeCounts = {
    all: tasks.length,
    today: tasks.filter((task) => task.dueDate === todayKey).length,
    upcoming: tasks.filter((task) => task.status !== 'done' && task.dueDate > todayKey).length,
    overdue: tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < todayKey).length,
  }

  function addTask(event) {
    event.preventDefault()
    const title = newTask.title.trim()
    if (!title) return
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    setTasks((current) => [{ ...newTask, title, id }, ...current])
    setNewTask(emptyTask)
    setIsModalOpen(false)
  }

  function startEditing(task) {
    setEditingId(task.id)
    setDraft({ ...task })
  }

  function saveEdit(event) {
    event.preventDefault()
    if (!draft?.title.trim()) return
    setTasks((current) => current.map((task) => (task.id === editingId ? { ...draft, title: draft.title.trim() } : task)))
    setEditingId(null)
    setDraft(null)
  }

  function deleteTask(task) {
    setPendingDelete([task])
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const deletedIds = new Set(pendingDelete.map((task) => task.id))
    setTasks((current) => current.filter((item) => !deletedIds.has(item.id)))
    setRecentlyDeleted(pendingDelete)
    setSelectedIds((current) => current.filter((id) => !deletedIds.has(id)))
    if (deletedIds.has(editingId)) {
      setEditingId(null)
      setDraft(null)
    }
    setPendingDelete(null)
  }

  function undoDelete() {
    if (!recentlyDeleted) return
    setTasks((current) => {
      const currentIds = new Set(current.map((task) => task.id))
      return [...recentlyDeleted.filter((task) => !currentIds.has(task.id)), ...current]
    })
    setRecentlyDeleted(null)
  }

  function toggleStatus(task) {
    const nextStatus = { todo: 'doing', doing: 'done', done: 'todo' }
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus[item.status] } : item)))
  }

  function duplicateTask(task) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    setTasks((current) => [{ ...task, id, title: `${task.title} (copy)`, status: 'todo' }, ...current])
  }

  function toggleVisibleSelection(shouldSelect) {
    const visibleIds = new Set(visibleTasks.map((task) => task.id))
    setSelectedIds((current) => shouldSelect
      ? [...new Set([...current, ...visibleIds])]
      : current.filter((id) => !visibleIds.has(id)))
  }

  function completeSelected() {
    const selected = new Set(selectedIds)
    setTasks((current) => current.map((task) => selected.has(task.id) ? { ...task, status: 'done' } : task))
    setSelectedIds([])
  }

  function exportTasks() {
    const columns = ['title', 'priority', 'status', 'dueDate']
    const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [columns, ...tasks.map((task) => columns.map((column) => task[column] ?? ''))]
      .map((row) => row.map(escapeCell).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `taskflow-${todayKey}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Taskflow home">
          <span className="brand-mark"><Check size={19} strokeWidth={3} /></span>
          <span>taskflow<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-actions">
          <span className="today-label"><CalendarDays size={15} /> {new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
          <button className="icon-button theme-toggle" type="button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <div className="dashboard" id="top">
        <section className="welcome-row">
          <div>
            <p className="eyebrow"><Sparkles size={13} /> YOUR WORKSPACE</p>
            <h1>{greeting},<br />let’s make today <span>count.</span></h1>
            <p className="welcome-copy">A clear mind starts with a clear plan. Here’s your day at a glance.</p>
            <button className="primary-button add-task-button" type="button" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} strokeWidth={2.5} /> Add a task
            </button>
          </div>
          <div className="hero-widgets">
            <aside className="day-card glass-card" aria-label="Today's progress">
              <div className="day-card-top"><span className="day-card-label">TODAY'S MOMENTUM</span><span className="sparkle-dot"><Sparkles size={14} /></span></div>
              <div className="day-card-progress">
                <div className="progress-ring" style={{ '--progress': `${completionPercent}%` }} role="img" aria-label={`${completionPercent}% of tasks completed`}><span>{completionPercent}<small>%</small></span></div>
                <div className="progress-summary"><strong>{completedCount} of {tasks.length}</strong><span>tasks completed</span><span className="due-today"><CalendarDays size={13} /> {dueTodayCount} due today</span></div>
              </div>
              <div className="progress-track" aria-hidden="true"><span style={{ width: `${completionPercent}%` }} /></div>
              <p className="day-card-note">{tasks.length === 0 ? 'A fresh page. Pick one thing to get started.' : completionPercent === 100 ? 'Everything checked off. Brilliant work!' : 'One step at a time. You’re making progress.'}</p>
            </aside>
            <WeatherCard />
          </div>
        </section>

        <section className="metrics-grid" aria-label="Task metrics">
          {metrics.map(({ label, value, icon: Icon, tone }) => (
            <article className="metric-card glass-card" key={label}>
              <div className={`metric-icon ${tone}`}><Icon size={19} /></div>
              <div className="metric-copy"><span>{label}</span><strong>{value}</strong></div>
              {label === 'Done' && tasks.length > 0 && <span className="metric-note">{completionPercent}% of all</span>}
            </article>
          ))}
        </section>

        <section className="tasks-section" aria-labelledby="tasks-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STAY ON TRACK</p>
              <h2 id="tasks-heading">Your tasks <span className="task-count">{tasks.length}</span></h2>
            </div>
            <div className="heading-actions">
              <button className="secondary-button export-button" type="button" onClick={exportTasks} disabled={tasks.length === 0} title="Export tasks as CSV"><Download size={16} /> Export CSV</button>
              <button className="secondary-button heading-add" type="button" onClick={() => setIsModalOpen(true)}><Plus size={16} /> New task</button>
            </div>
          </div>

          <div className="date-scopes" role="group" aria-label="Tasks by due date">
            {[
              { key: 'all', label: 'All tasks' },
              { key: 'today', label: 'Today' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'overdue', label: 'Overdue' },
            ].map(({ key, label }) => (
              <button className={`date-scope ${dateScope === key ? 'is-active' : ''}`} type="button" aria-pressed={dateScope === key} key={key} onClick={() => setDateScope(key)}>
                {label}<span>{dateScopeCounts[key]}</span>
              </button>
            ))}
          </div>

          <div className="filter-bar">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search tasks</span>
              <input type="search" placeholder="Search your tasks..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <button className="clear-search" type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}
            </label>
            <div className="filter-controls">
              <label className="filter-select"><ArrowDownUp size={14} /><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></select></label>
              <label className="filter-select"><span className="priority-dot" /><span className="sr-only">Filter by priority</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="med">Medium priority</option><option value="low">Low priority</option></select></label>
              <label className="filter-select sort-select"><span className="sr-only">Sort tasks</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="due">Due date</option><option value="priority">Priority</option><option value="title">Name</option></select></label>
            </div>
          </div>

          {selectedIds.length > 0 && <div className="bulk-toolbar" role="region" aria-label="Bulk task actions">
            <strong>{selectedIds.length} selected</strong>
            <button type="button" onClick={completeSelected}><CheckCheck size={15} /> Mark done</button>
            <button type="button" className="bulk-delete" onClick={() => setPendingDelete(tasks.filter((task) => selectedIds.includes(task.id)))}><Trash2 size={15} /> Delete</button>
            <button type="button" className="bulk-clear" onClick={() => setSelectedIds([])}>Clear selection</button>
          </div>}

          <div className="task-list glass-card">
            {visibleTasks.length > 0 ? (
              <>
                <div className="task-list-head">
                  <label className="select-visible"><input type="checkbox" aria-label="Select all visible tasks" checked={visibleTasks.length > 0 && visibleTasks.every((task) => selectedIds.includes(task.id))} onChange={(event) => toggleVisibleSelection(event.target.checked)} /></label>
                  <span>Task</span><span>Priority</span><span>Status</span><span>Due date</span><span className="sr-only">Actions</span>
                </div>
                {visibleTasks.map((task) => {
                  const isEditing = editingId === task.id
                  const taskData = isEditing ? draft : task
                  return (
                    <form className={`task-row ${isEditing ? 'is-editing' : ''}`} key={task.id} onSubmit={isEditing ? saveEdit : (event) => event.preventDefault()}>
                      <div className="task-selection"><input className="task-checkbox" type="checkbox" aria-label={`Select ${task.title}`} checked={selectedIds.includes(task.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /></div>
                      <div className="task-title-cell">
                        <button className={`completion-button ${task.status === 'done' ? 'is-complete' : ''}`} type="button" aria-label={`Move ${task.title} to ${task.status === 'todo' ? 'in progress' : task.status === 'doing' ? 'done' : 'to do'}`} onClick={() => toggleStatus(task)}>
                          {task.status === 'done' ? <Check size={14} /> : task.status === 'doing' ? <span className="completion-dash" /> : <Circle size={17} />}
                        </button>
                        {isEditing ? <input className="inline-input title-input" aria-label="Task title" value={taskData.title} onChange={(event) => setDraft({ ...taskData, title: event.target.value })} autoFocus /> : <span className={`task-title ${task.status === 'done' ? 'done-title' : ''}`}>{task.title}</span>}
                      </div>
                      <div className="task-priority-cell">{isEditing ? <select aria-label="Priority" className="inline-select" value={taskData.priority} onChange={(event) => setDraft({ ...taskData, priority: event.target.value })}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select> : <span className={`priority-badge ${task.priority}`}>{task.priority === 'med' ? 'Medium' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>}</div>
                      <div className="task-status-cell">{isEditing ? <select aria-label="Status" className="inline-select" value={taskData.status} onChange={(event) => setDraft({ ...taskData, status: event.target.value })}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></select> : <button className={`status-badge ${task.status}`} type="button" onClick={() => toggleStatus(task)} title="Click to change status"><span />{task.status === 'todo' ? 'To do' : task.status === 'doing' ? 'In progress' : 'Done'}</button>}</div>
                      <div className="task-date-cell">{isEditing ? <input aria-label="Due date" className="inline-input date-input" type="date" value={taskData.dueDate || ''} onChange={(event) => setDraft({ ...taskData, dueDate: event.target.value })} /> : <span className={!task.dueDate ? 'no-date' : task.status !== 'done' && task.dueDate < todayKey ? 'overdue-date' : ''}>{task.dueDate && <CalendarDays size={14} />}{formatDate(task.dueDate)}</span>}</div>
                      <div className="task-actions">
                        {isEditing ? <><button className="row-action save-action" type="submit" aria-label="Save changes" title="Save"><Check size={16} /></button><button className="row-action" type="button" aria-label="Cancel editing" title="Cancel" onClick={() => { setEditingId(null); setDraft(null) }}><X size={16} /></button></> : <><button className="row-action" type="button" aria-label={`Duplicate ${task.title}`} title="Duplicate task" onClick={() => duplicateTask(task)}><Copy size={15} /></button><button className="row-action" type="button" aria-label={`Edit ${task.title}`} title="Edit task" onClick={() => startEditing(task)}><span className="edit-glyph">✎</span></button><button className="row-action delete-action" type="button" aria-label={`Delete ${task.title}`} title="Delete task" onClick={() => deleteTask(task)}><Trash2 size={15} /></button></>}
                      </div>
                    </form>
                  )
                })}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><ClipboardList size={25} /></div>
                <h3>{tasks.length === 0 ? 'A fresh start.' : 'No tasks found'}</h3>
                <p>{tasks.length === 0 ? 'Your to-do list is looking nice and clear. Add a task to get the ball rolling.' : 'Try adjusting your search or filters to find what you’re looking for.'}</p>
                {tasks.length === 0 && <button className="primary-button" type="button" onClick={() => setIsModalOpen(true)}><Plus size={17} /> Add your first task</button>}
                {(search || statusFilter !== 'all' || priorityFilter !== 'all' || dateScope !== 'all') && tasks.length > 0 && <button className="text-button" type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setDateScope('all') }}>Clear filters</button>}
              </div>
            )}
            {visibleTasks.length > 0 && <div className="list-footer"><span>Showing {visibleTasks.length} of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span><span><span className="live-dot" /> Saved automatically</span></div>}
          </div>
        </section>
        <footer className="page-footer"><span>Small steps add up to big things.</span><span>Made for your focus <span aria-hidden="true">✳</span></span></footer>
      </div>

      {isModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false) }}>
        <section className="task-modal glass-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><p className="eyebrow">MAKE IT HAPPEN</p><h2 id="modal-title">Add a new task</h2></div><button className="icon-button" type="button" aria-label="Close dialog" onClick={() => setIsModalOpen(false)}><X size={19} /></button></div>
          <form className="task-form" onSubmit={addTask}>
            <label className="form-field">Task name<input autoFocus required maxLength={120} placeholder="e.g. Prep for the product review" value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} /></label>
            <div className="form-row"><label className="form-field">Priority<select value={newTask.priority} onChange={(event) => setNewTask({ ...newTask, priority: event.target.value })}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select></label><label className="form-field">Status<select value={newTask.status} onChange={(event) => setNewTask({ ...newTask, status: event.target.value })}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></select></label></div>
            <label className="form-field">Due date <span className="optional-label">· optional</span><input type="date" value={newTask.dueDate} onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })} /></label>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={17} /> Create task</button></div>
          </form>
        </section>
      </div>}

      {pendingDelete && <div className="modal-backdrop delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null) }}>
        <section className="delete-dialog glass-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
          <div className="delete-icon"><Trash2 size={20} /></div>
          <h2 id="delete-title">{pendingDelete.length === 1 ? 'Delete this task?' : `Delete ${pendingDelete.length} tasks?`}</h2>
          <p id="delete-description"><strong>{pendingDelete.length === 1 ? pendingDelete[0].title : `${pendingDelete.length} selected tasks`}</strong> will be removed from your list. You can undo this for a short time.</p>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setPendingDelete(null)}>Keep task</button><button className="danger-button" type="button" onClick={confirmDelete}><Trash2 size={15} /> Delete task</button></div>
        </section>
      </div>}

      {recentlyDeleted && <div className="undo-toast" role="status" aria-live="polite">
        <span>{recentlyDeleted.length === 1 ? 'Task deleted' : `${recentlyDeleted.length} tasks deleted`}</span>
        <button type="button" onClick={undoDelete}>Undo</button>
        <button className="toast-dismiss" type="button" aria-label="Dismiss undo message" onClick={() => setRecentlyDeleted(null)}><X size={16} /></button>
      </div>}
    </main>
  )
}

export default App
