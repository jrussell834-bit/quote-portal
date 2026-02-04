import React, { useEffect, useState } from 'react';
import { 
  fetchCustomers, 
  fetchCustomerById, 
  updateCustomer,
  fetchContactsByCustomerId,
  createContact,
  fetchActivitiesByCustomerId,
  createActivity,
  fetchTasksByCustomerId,
  fetchAllTasks,
  createTask,
  updateTask,
  type Customer,
  type Contact,
  type Activity,
  type Task
} from '../api';
import { Footer } from './Footer';

type View = 'customers' | 'customer-detail' | 'tasks';

export const CRMApp: React.FC<{ onNavigateToDashboard: () => void }> = ({ onNavigateToDashboard }) => {
  const [view, setView] = useState<View>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Customer edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Contact form state
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactJobTitle, setContactJobTitle] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Activity form state
  const [activityType, setActivityType] = useState('call');
  const [activitySubject, setActivitySubject] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (view === 'customers') {
      loadCustomers();
    } else if (view === 'customer-detail' && selectedCustomer) {
      loadCustomerDetails();
    } else if (view === 'tasks') {
      loadAllTasks();
    }
  }, [view, selectedCustomer]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load customers.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async () => {
    if (!selectedCustomer) return;
    try {
      setLoading(true);
      const [customerData, contactsData, activitiesData, tasksData] = await Promise.all([
        fetchCustomerById(selectedCustomer.id),
        fetchContactsByCustomerId(selectedCustomer.id),
        fetchActivitiesByCustomerId(selectedCustomer.id),
        fetchTasksByCustomerId(selectedCustomer.id)
      ]);
      setSelectedCustomer(customerData);
      setContacts(contactsData);
      setActivities(activitiesData);
      setTasks(tasksData);
    } catch (err) {
      console.error(err);
      setError('Unable to load customer details.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setView('customer-detail');
    setIsEditingCustomer(false);
  };

  const handleEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditName(selectedCustomer.name);
    setEditEmail(selectedCustomer.email || '');
    setEditPhone(selectedCustomer.phone || '');
    setEditWebsite(selectedCustomer.website || '');
    setEditAddress(selectedCustomer.address || '');
    setEditIndustry(selectedCustomer.industry || '');
    setEditNotes(selectedCustomer.notes || '');
    setIsEditingCustomer(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const updated = await updateCustomer(selectedCustomer.id, {
        name: editName,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        website: editWebsite || undefined,
        address: editAddress || undefined,
        industry: editIndustry || undefined,
        notes: editNotes || undefined
      });
      setSelectedCustomer(updated);
      setIsEditingCustomer(false);
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setError('Unable to update customer.');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const newContact = await createContact(selectedCustomer.id, {
        firstName: contactFirstName,
        lastName: contactLastName,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
        jobTitle: contactJobTitle || undefined,
        notes: contactNotes || undefined
      });
      setContacts([...contacts, newContact]);
      setIsAddingContact(false);
      setContactFirstName('');
      setContactLastName('');
      setContactEmail('');
      setContactPhone('');
      setContactJobTitle('');
      setContactNotes('');
    } catch (err) {
      console.error(err);
      setError('Unable to create contact.');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    try {
      setError(null);
      const newActivity = await createActivity(selectedCustomer.id, {
        type: activityType,
        subject: activitySubject.trim() || undefined,
        description: activityDescription.trim() || undefined,
        activityDate: activityDate || new Date().toISOString().split('T')[0]
      });
      setActivities([newActivity, ...activities]);
      setIsAddingActivity(false);
      setActivityType('call');
      setActivitySubject('');
      setActivityDescription('');
      setActivityDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Create activity error:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Unable to create activity. Please try again.';
      setError(errorMessage);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const newTask = await createTask({
        customerId: selectedCustomer.id,
        title: taskTitle,
        description: taskDescription || undefined,
        dueDate: taskDueDate || undefined,
        priority: taskPriority
      });
      setTasks([...tasks, newTask]);
      setIsAddingTask(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
      setTaskPriority('medium');
    } catch (err) {
      console.error(err);
      setError('Unable to create task.');
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, { completed: !task.completed });
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
    } catch (err) {
      console.error(err);
      setError('Unable to update task.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.reload();
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'tasks') {
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
                <h1 className="text-lg font-semibold text-slate-900">Tasks</h1>
                <p className="text-xs text-slate-500">Manage all tasks across customers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('customers')}
                className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Customers
              </button>
              <button
                onClick={onNavigateToDashboard}
                className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Logout
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
          ) : tasks.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500">No tasks found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task)}
                          className="rounded border-slate-300"
                        />
                        <h3 className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        {task.customerName && (
                          <span>Customer: {task.customerName}</span>
                        )}
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (view === 'customer-detail' && selectedCustomer) {
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
              <button
                onClick={() => {
                  setView('customers');
                  setSelectedCustomer(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {selectedCustomer.name}
                </h1>
                <p className="text-xs text-slate-500">CRM Details</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('tasks')}
                className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Tasks
              </button>
              <button
                onClick={onNavigateToDashboard}
                className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Logout
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
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Information */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Customer Information</h2>
                    {!isEditingCustomer && (
                      <button
                        onClick={handleEditCustomer}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingCustomer ? (
                    <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Name</span>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Email</span>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Phone</span>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Website</span>
                          <input
                            type="url"
                            value={editWebsite}
                            onChange={(e) => setEditWebsite(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Address</span>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Industry</span>
                        <input
                          type="text"
                          value={editIndustry}
                          onChange={(e) => setEditIndustry(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Notes</span>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingCustomer(false)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-medium text-slate-600">Name:</span>
                        <p className="text-slate-900">{selectedCustomer.name}</p>
                      </div>
                      {selectedCustomer.email && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Email:</span>
                          <p className="text-slate-900">{selectedCustomer.email}</p>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Phone:</span>
                          <p className="text-slate-900">{selectedCustomer.phone}</p>
                        </div>
                      )}
                      {selectedCustomer.website && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Website:</span>
                          <a href={selectedCustomer.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                            {selectedCustomer.website}
                          </a>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Address:</span>
                          <p className="text-slate-900">{selectedCustomer.address}</p>
                        </div>
                      )}
                      {selectedCustomer.industry && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Industry:</span>
                          <p className="text-slate-900">{selectedCustomer.industry}</p>
                        </div>
                      )}
                      {selectedCustomer.notes && (
                        <div>
                          <span className="text-xs font-medium text-slate-600">Notes:</span>
                          <p className="text-slate-900 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contacts */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
                    {!isAddingContact && (
                      <button
                        onClick={() => setIsAddingContact(true)}
                        className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                      >
                        + Add Contact
                      </button>
                    )}
                  </div>

                  {isAddingContact && (
                    <form onSubmit={handleAddContact} className="mb-4 space-y-3 text-sm border-b border-slate-200 pb-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">First Name</span>
                          <input
                            type="text"
                            value={contactFirstName}
                            onChange={(e) => setContactFirstName(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Last Name</span>
                          <input
                            type="text"
                            value={contactLastName}
                            onChange={(e) => setContactLastName(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                            required
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Email</span>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Phone</span>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Job Title</span>
                        <input
                          type="text"
                          value={contactJobTitle}
                          onChange={(e) => setContactJobTitle(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Notes</span>
                        <textarea
                          value={contactNotes}
                          onChange={(e) => setContactNotes(e.target.value)}
                          rows={2}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingContact(false)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add Contact
                        </button>
                      </div>
                    </form>
                  )}

                  {contacts.length === 0 ? (
                    <p className="text-xs text-slate-500">No contacts added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="rounded-lg border border-slate-200 p-3">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {contact.firstName} {contact.lastName}
                          </h3>
                          {contact.jobTitle && (
                            <p className="text-xs text-slate-600">{contact.jobTitle}</p>
                          )}
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            {contact.email && <p>Email: {contact.email}</p>}
                            {contact.phone && <p>Phone: {contact.phone}</p>}
                            {contact.notes && <p className="text-slate-600">{contact.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activities */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Activity Timeline</h2>
                    {!isAddingActivity && (
                      <button
                        onClick={() => setIsAddingActivity(true)}
                        className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                      >
                        + Log Activity
                      </button>
                    )}
                  </div>

                  {isAddingActivity && (
                    <form onSubmit={handleAddActivity} className="mb-4 space-y-3 text-sm border-b border-slate-200 pb-4">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Type</span>
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        >
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="meeting">Meeting</option>
                          <option value="note">Note</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Subject</span>
                        <input
                          type="text"
                          value={activitySubject}
                          onChange={(e) => setActivitySubject(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Description</span>
                        <textarea
                          value={activityDescription}
                          onChange={(e) => setActivityDescription(e.target.value)}
                          rows={3}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Date</span>
                        <input
                          type="date"
                          value={activityDate}
                          onChange={(e) => setActivityDate(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingActivity(false)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Log Activity
                        </button>
                      </div>
                    </form>
                  )}

                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-500">No activities logged yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  {activity.type}
                                </span>
                                {activity.subject && (
                                  <span className="text-sm font-semibold text-slate-900">{activity.subject}</span>
                                )}
                              </div>
                              {activity.description && (
                                <p className="mt-1 text-xs text-slate-600">{activity.description}</p>
                              )}
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(activity.activityDate).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
                    {!isAddingTask && (
                      <button
                        onClick={() => setIsAddingTask(true)}
                        className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                      >
                        + Add Task
                      </button>
                    )}
                  </div>

                  {isAddingTask && (
                    <form onSubmit={handleAddTask} className="mb-4 space-y-3 text-sm border-b border-slate-200 pb-4">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Title</span>
                        <input
                          type="text"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Description</span>
                        <textarea
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          rows={2}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Due Date</span>
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={(e) => setTaskDueDate(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600">Priority</span>
                          <select
                            value={taskPriority}
                            onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingTask(false)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add Task
                        </button>
                      </div>
                    </form>
                  )}

                  {tasks.length === 0 ? (
                    <p className="text-xs text-slate-500">No tasks for this customer.</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleTask(task)}
                                className="rounded border-slate-300"
                              />
                              <div className="flex-1">
                                <h3 className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                  <span className={`rounded-full px-2 py-0.5 font-medium ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Sidebar */}
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">Summary</h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-medium text-slate-600">Contacts:</span>
                      <p className="text-slate-900 font-semibold">{contacts.length}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-600">Activities:</span>
                      <p className="text-slate-900 font-semibold">{activities.length}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-600">Active Tasks:</span>
                      <p className="text-slate-900 font-semibold">{tasks.filter(t => !t.completed).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // Customers list view
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
              <h1 className="text-lg font-semibold text-slate-900">CRM</h1>
              <p className="text-xs text-slate-500">Customer Relationship Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('tasks')}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Tasks
            </button>
            <button
              onClick={onNavigateToDashboard}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Logout
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

        <div className="mb-4">
          <input
            type="search"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading customers...</p>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md cursor-pointer"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{customer.name}</h3>
                <div className="space-y-1 text-xs text-slate-500">
                  {customer.email && <p>Email: {customer.email}</p>}
                  {customer.phone && <p>Phone: {customer.phone}</p>}
                  {customer.industry && <p>Industry: {customer.industry}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
