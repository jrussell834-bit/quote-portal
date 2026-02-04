import React, { useEffect, useState } from 'react';
import { fetchMyTasks, createTask, updateTask, fetchQuotes, type Task } from '../api';
import type { QuoteCard } from './KanbanApp';
import { Footer } from './Footer';

export const TasksApp: React.FC<{ onNavigateToDashboard: () => void }> = ({ onNavigateToDashboard }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskQuoteId, setTaskQuoteId] = useState<string>('');

  useEffect(() => {
    loadTasks();
    loadQuotes();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchMyTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async () => {
    try {
      const data = await fetchQuotes();
      setQuotes(data);
    } catch (err) {
      console.error('Error loading quotes:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      const newTask = await createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        priority: taskPriority,
        quoteId: taskQuoteId || undefined
      });
      setTasks([...tasks, newTask]);
      resetTaskForm();
      setIsAddingTask(false);
      setError(null);
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      const updated = await updateTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        priority: taskPriority,
        completed: editingTask.completed,
        quoteId: taskQuoteId || undefined
      });
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      resetTaskForm();
      setEditingTask(null);
      setError(null);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, {
        completed: !task.completed
      });
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setTaskPriority(task.priority);
    setTaskQuoteId(task.quoteId || '');
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
    setTaskPriority('medium');
    setTaskQuoteId('');
  };

  const handleCloseModal = () => {
    setIsAddingTask(false);
    setEditingTask(null);
    resetTaskForm();
    setError(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQuoteTitle = (quoteId: string | null | undefined) => {
    if (!quoteId) return null;
    const quote = quotes.find(q => q.id === quoteId);
    return quote ? `${quote.title} - ${quote.clientName}` : null;
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Company Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                My Tasks
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setIsAddingTask(true)}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              New Task
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 flex-1">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading tasks...</p>
        ) : (
          <>
            {/* Pending Tasks */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                Pending Tasks ({pendingTasks.length})
              </h2>
              {pendingTasks.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                  <p className="text-sm text-slate-500">No pending tasks</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleComplete(task)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {task.dueDate && (
                              <span>
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.quoteId && getQuoteTitle(task.quoteId) && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                Lead: {getQuoteTitle(task.quoteId)}
                              </span>
                            )}
                            {task.customerName && (
                              <span>Customer: {task.customerName}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  Completed Tasks ({completedTasks.length})
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200 opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleComplete(task)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <h3 className="text-base font-semibold text-slate-600 line-through">{task.title}</h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                          )}
                          {task.quoteId && getQuoteTitle(task.quoteId) && (
                            <span className="text-xs text-slate-500">
                              Lead: {getQuoteTitle(task.quoteId)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Task Modal */}
      {(isAddingTask || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Link to Lead
                  </label>
                  <select
                    value={taskQuoteId}
                    onChange={(e) => setTaskQuoteId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.title} - {quote.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
