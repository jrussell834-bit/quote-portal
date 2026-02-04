import React, { useEffect, useMemo, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from '@hello-pangea/dnd';
import { createQuote, fetchQuotes, updateQuotePositions, uploadQuoteAttachment, updateQuote, fetchCustomers, createCustomer, type Customer } from '../api';
import { Footer } from './Footer';

type StageKey = 'new' | 'follow_up' | 'tender' | 'won' | 'lost';

export type QuoteCard = {
  id: string;
  title: string;
  clientName: string;
  customerId?: string | null;
  customerName?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  value?: number;
  stage: StageKey;
  position?: number;
  soNumber?: string | null;
  lastChasedAt?: string;
  nextChaseAt?: string;
  reminderEmail?: string;
  attachmentUrl?: string;
  status?: 'Tender' | 'OTP';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STAGES: { id: StageKey; title: string }[] = [
  { id: 'new', title: 'New' },
  { id: 'follow_up', title: 'Follow-up' },
  { id: 'tender', title: 'Tender' },
  { id: 'won', title: 'Won' },
  { id: 'lost', title: 'Lost' }
];

export const KanbanApp: React.FC<{ onNavigateToCustomers: () => void; onNavigateToCRM?: () => void; onNavigateToTasks?: () => void }> = ({ onNavigateToCustomers, onNavigateToCRM, onNavigateToTasks }) => {
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newQuoteTitle, setNewQuoteTitle] = useState('');
  const [newQuoteClient, setNewQuoteClient] = useState('');
  const [newQuoteValue, setNewQuoteValue] = useState<string>('');
  const [newQuoteSoNumber, setNewQuoteSoNumber] = useState('');
  const [newQuoteEmail, setNewQuoteEmail] = useState('');
  const [newQuoteNextChase, setNewQuoteNextChase] = useState('');
  const [newQuoteFile, setNewQuoteFile] = useState<File | null>(null);
  const [newQuoteStatus, setNewQuoteStatus] = useState<'Tender' | 'OTP'>('Tender');
  const [newQuoteNotes, setNewQuoteNotes] = useState('');
  const [editingQuote, setEditingQuote] = useState<QuoteCard | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editSoNumber, setEditSoNumber] = useState('');
  const [editStatus, setEditStatus] = useState<'Tender' | 'OTP'>('Tender');
  const [editEmail, setEditEmail] = useState('');
  const [editNextChase, setEditNextChase] = useState('');
  const [editLastChased, setEditLastChased] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadCustomers = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchQuotes();
        setQuotes(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load quotes from the server.');
      } finally {
        setLoading(false);
      }
    })();
    loadCustomers();
  }, []);

  const filteredQuotes = useMemo(() => {
    if (!filter.trim()) return quotes;
    const term = filter.toLowerCase();
    return quotes.filter(
      (q) =>
        q.title.toLowerCase().includes(term) ||
        q.clientName.toLowerCase().includes(term)
    );
  }, [quotes, filter]);

  const quotesByStage = useMemo(
    () =>
      STAGES.reduce<Record<StageKey, QuoteCard[]>>((acc, stage) => {
        const stageQuotes = filteredQuotes
          .filter((q) => q.stage === stage.id)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        acc[stage.id] = stageQuotes;
        return acc;
      }, {} as Record<StageKey, QuoteCard[]>),
    [filteredQuotes]
  );

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const wonCount = quotes.filter(q => q.stage === 'won').length;
    const lostCount = quotes.filter(q => q.stage === 'lost').length;
    
    // Calculate year-to-date value (won projects updated this year)
    // We use updatedAt to determine when the project was won (moved to won stage)
    const currentYear = new Date().getFullYear();
    const ytdValue = quotes
      .filter(q => q.stage === 'won' && q.value != null)
      .filter(q => {
        // Check if the quote was updated this year (when it was won)
        // This gives us projects won in the current year
        const dateStr = q.updatedAt || q.createdAt;
        if (!dateStr) return true; // Include if no date available
        const updatedYear = new Date(dateStr).getFullYear();
        return updatedYear === currentYear;
      })
      .reduce((sum, q) => sum + (q.value || 0), 0);

    return {
      won: wonCount,
      lost: lostCount,
      ytdValue
    };
  }, [quotes]);

  const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStage = source.droppableId as StageKey;
    const destStage = destination.droppableId as StageKey;
    const destIndex = destination.index;

    // Get all quotes in the destination stage (after filtering)
    const destStageQuotes = quotesByStage[destStage] || [];
    
    // Calculate new positions for all affected quotes
    const updates: Array<{ id: string; position: number; stage: StageKey }> = [];
    
    if (sourceStage === destStage) {
      // Reordering within the same column
      const sourceQuotes = [...destStageQuotes];
      const [movedQuote] = sourceQuotes.splice(source.index, 1);
      sourceQuotes.splice(destIndex, 0, movedQuote);
      
      // Update positions for all quotes in this stage
      sourceQuotes.forEach((quote, index) => {
        updates.push({
          id: quote.id,
          position: index + 1,
          stage: destStage
        });
      });
    } else {
      // Moving between columns
      const sourceQuotes = [...(quotesByStage[sourceStage] || [])];
      const destQuotes = [...destStageQuotes];
      const [movedQuote] = sourceQuotes.splice(source.index, 1);
      destQuotes.splice(destIndex, 0, { ...movedQuote, stage: destStage });
      
      // Update positions for source stage quotes
      sourceQuotes.forEach((quote, index) => {
        updates.push({
          id: quote.id,
          position: index + 1,
          stage: sourceStage
        });
      });
      
      // Update positions for destination stage quotes
      destQuotes.forEach((quote, index) => {
        updates.push({
          id: quote.id,
          position: index + 1,
          stage: destStage
        });
      });
    }

    // Optimistic update
    setQuotes((prev) => {
      const updated = [...prev];
      const quoteIndex = updated.findIndex((q) => q.id === draggableId);
      if (quoteIndex !== -1) {
        updated[quoteIndex] = { ...updated[quoteIndex], stage: destStage };
      }
      // Re-sort by position
      return updated.map((q) => {
        const update = updates.find((u) => u.id === q.id);
        return update ? { ...q, stage: update.stage, position: update.position } : q;
      });
    });

    try {
      if (updates.length > 0) {
        await updateQuotePositions(updates);
        // Refresh quotes to get latest data
        const refreshed = await fetchQuotes();
        setQuotes(refreshed);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to update quote position.');
      // Revert optimistic update on error
      const refreshed = await fetchQuotes();
      setQuotes(refreshed);
    }
  };

  const resetNewQuoteForm = () => {
    setNewQuoteTitle('');
    setNewQuoteClient('');
    setNewQuoteValue('');
    setNewQuoteSoNumber('');
    setNewQuoteEmail('');
    setNewQuoteNextChase('');
    setNewQuoteFile(null);
    setNewQuoteStatus('Tender');
    setNewQuoteNotes('');
    setSelectedCustomerId('');
    setNewCustomerName('');
    setIsCreatingNewCustomer(false);
  };

  const handleOpenNewModal = () => {
    resetNewQuoteForm();
    setIsNewModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.reload();
  };

  const handleEditQuote = (quote: QuoteCard) => {
    setEditingQuote(quote);
    setEditNotes(quote.notes || '');
    setEditTitle(quote.title || '');
    setEditClientName(quote.clientName || '');
    setEditValue(quote.value?.toString() || '');
    setEditSoNumber(quote.soNumber || '');
    setEditStatus(quote.status || 'Tender');
    setEditEmail(quote.reminderEmail || '');
    setEditNextChase(quote.nextChaseAt ? new Date(quote.nextChaseAt).toISOString().split('T')[0] : '');
    setEditLastChased(quote.lastChasedAt ? new Date(quote.lastChasedAt).toISOString().split('T')[0] : '');
    setEditFile(null);
    setPdfPreviewUrl(null);
  };

  const handleCloseEditModal = () => {
    setEditingQuote(null);
    setEditNotes('');
    setEditTitle('');
    setEditClientName('');
    setEditValue('');
    setEditSoNumber('');
    setEditStatus('Tender');
    setEditEmail('');
    setEditNextChase('');
    setEditLastChased('');
    setEditFile(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleViewPdf = (url: string) => {
    // If it's a relative URL, make it absolute
    // For Railway/production, the URL should already be correct
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    setPdfPreviewUrl(fullUrl);
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;

    setUpdating(true);
    try {
      const valueNumber = editValue ? Number(editValue) : undefined;
      const payload: Partial<QuoteCard> = {
        title: editTitle.trim(),
        clientName: editClientName.trim(),
        value: Number.isNaN(valueNumber) ? undefined : valueNumber,
        soNumber: editSoNumber.trim() || undefined,
        status: editStatus,
        reminderEmail: editEmail.trim() || undefined,
        nextChaseAt: editNextChase ? new Date(editNextChase).toISOString() : undefined,
        lastChasedAt: editLastChased ? new Date(editLastChased).toISOString() : undefined,
        notes: editNotes.trim() || undefined
      };

      let updated = await updateQuote(editingQuote.id, payload);

      // Upload new file if provided
      if (editFile) {
        updated = await uploadQuoteAttachment(editingQuote.id, editFile);
      }

      setQuotes((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q))
      );
      handleCloseEditModal();
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to update lead. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteTitle.trim() || !newQuoteClient.trim()) {
      setError('Please enter organisation and customer name.');
      return;
    }

    setCreating(true);
    try {
      let customerId: string | undefined = undefined;
      
      // If creating a new customer
      if (isCreatingNewCustomer && newCustomerName.trim()) {
        const newCustomer = await createCustomer(newCustomerName.trim());
        customerId = newCustomer.id;
        await loadCustomers(); // Refresh customer list
      } else if (selectedCustomerId && selectedCustomerId.trim()) {
        // Use selected customer
        customerId = selectedCustomerId.trim();
      }

      const valueNumber = newQuoteValue ? Number(newQuoteValue) : undefined;
      const payload: Partial<QuoteCard> = {
        title: newQuoteTitle.trim(),
        clientName: newQuoteClient.trim(),
        customerId: customerId,
        customerName: isCreatingNewCustomer ? newCustomerName.trim() : (customerId ? customers.find(c => c.id === customerId)?.name : undefined),
        value: Number.isNaN(valueNumber) ? undefined : valueNumber,
        soNumber: newQuoteSoNumber.trim() || undefined,
        stage: 'new',
        reminderEmail: newQuoteEmail || undefined,
        nextChaseAt: newQuoteNextChase ? new Date(newQuoteNextChase).toISOString() : undefined,
        status: newQuoteStatus,
        notes: newQuoteNotes.trim() || undefined
      };

      const created = await createQuote({
        ...payload
      });

      let finalQuote = { ...created, stage: 'new' as StageKey };

      if (newQuoteFile) {
        const uploaded = await uploadQuoteAttachment(created.id, newQuoteFile);
        finalQuote = { ...uploaded, stage: 'new' as StageKey };
      }

      setQuotes((prev) => [...prev, finalQuote]);
      setIsNewModalOpen(false);
      resetNewQuoteForm();
      setError(null);
    } catch (err: any) {
      console.error('Create quote error:', err);
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to create quote. Please try again.';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

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
                Quote Pipeline
              </h1>
              <p className="text-xs text-slate-500">
                Kanban view of active quotes and follow-ups
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search by client or quote..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
            />
            <button
              type="button"
              onClick={onNavigateToCustomers}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Customers
            </button>
            {onNavigateToCRM && (
              <button
                type="button"
                onClick={onNavigateToCRM}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                CRM
              </button>
            )}
            {onNavigateToTasks && (
              <button
                type="button"
                onClick={onNavigateToTasks}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                My Tasks
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenNewModal}
              disabled={creating}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-60"
            >
              New lead
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Dashboard Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 shadow-sm ring-1 ring-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Won</p>
                <p className="mt-1 text-2xl font-bold text-green-900">{dashboardStats.won}</p>
              </div>
              <div className="rounded-full bg-green-200 p-3">
                <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 shadow-sm ring-1 ring-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700">Lost</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{dashboardStats.lost}</p>
              </div>
              <div className="rounded-full bg-red-200 p-3">
                <svg className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm ring-1 ring-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">YTD Value</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  £{dashboardStats.ytdValue.toLocaleString()}
                </p>
                <p className="mt-0.5 text-[10px] text-blue-600">Year to Date</p>
              </div>
              <div className="rounded-full bg-blue-200 p-3">
                <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading quotes...</p>
        ) : null}
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {STAGES.map((stage) => {
              const items = quotesByStage[stage.id];
              return (
                <section
                  key={stage.id}
                  className="flex min-h-[200px] flex-col rounded-2xl bg-slate-50/80 p-3 shadow-sm ring-1 ring-slate-200/80"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {stage.title}
                    </h2>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                      {items.length}
                    </span>
                  </div>
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-1 flex-col gap-2 rounded-xl border border-dashed border-transparent p-1 transition-colors ${
                          snapshot.isDraggingOver
                            ? 'border-blue-400 bg-blue-50/60'
                            : 'border-slate-200/40'
                        }`}
                      >
                        {items.map((quote, index) => (
                          <Draggable
                            key={quote.id}
                            draggableId={quote.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <article
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                onClick={(e) => {
                                  // Only open edit modal if not dragging and not clicking on a button/link
                                  if (!isDragging && !dragSnapshot.isDragging && 
                                      !(e.target as HTMLElement).closest('button') &&
                                      !(e.target as HTMLElement).closest('a')) {
                                    handleEditQuote(quote);
                                  }
                                }}
                                className={`group relative rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md cursor-pointer ${
                                  dragSnapshot.isDragging
                                    ? 'ring-blue-500 shadow-lg opacity-90 cursor-grabbing'
                                    : 'hover:ring-blue-300'
                                }`}
                              >
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                  style={{ zIndex: 0 }}
                                />
                                <div className="relative z-10 flex items-start justify-between gap-2 mb-1">
                                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 flex-1">
                                    {quote.title}
                                  </h3>
                                </div>
                                <p className="mb-1 text-xs font-medium text-slate-600">
                                  {quote.clientName}
                                </p>
                                {quote.value != null && (
                                  <p className="mb-1 text-xs text-slate-500">
                                    Value:{' '}
                                    <span className="font-semibold text-slate-800">
                                      £{quote.value.toLocaleString()}
                                    </span>
                                  </p>
                                )}
                                {quote.soNumber && (
                                  <p className="mb-1 text-xs text-slate-500">
                                    SO: <span className="font-medium text-slate-700">{quote.soNumber}</span>
                                  </p>
                                )}
                                {quote.createdByName && (
                                  <p className="mb-1 text-xs text-slate-500">
                                    Created by: <span className="font-medium text-slate-700">{quote.createdByName}</span>
                                  </p>
                                )}
                                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                  <div className="flex flex-col">
                                    <span className="uppercase tracking-wide text-slate-400">
                                      Last chased
                                    </span>
                                    <span>
                                      {quote.lastChasedAt
                                        ? new Date(
                                            quote.lastChasedAt
                                          ).toLocaleDateString()
                                        : 'Not chased'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="uppercase tracking-wide text-slate-400">
                                      Next chase
                                    </span>
                                    <span>
                                      {quote.nextChaseAt
                                        ? new Date(
                                            quote.nextChaseAt
                                          ).toLocaleDateString()
                                        : 'Not set'}
                                    </span>
                                  </div>
                                </div>
                                {quote.notes && (
                                  <div className="mt-2 rounded-md bg-slate-50 p-2">
                                    <p className="line-clamp-2 text-[11px] text-slate-600">
                                      {quote.notes}
                                    </p>
                                  </div>
                                )}
                                {quote.attachmentUrl && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <a
                                      href={quote.attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      View quote
                                    </a>
                                    {quote.attachmentUrl.toLowerCase().endsWith('.pdf') && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleViewPdf(quote.attachmentUrl!);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        | Preview PDF
                                      </button>
                                    )}
                                  </div>
                                )}
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && (
                          <p className="py-4 text-center text-[11px] text-slate-400">
                            Drop quotes here
                          </p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </div>
        </DragDropContext>
      </main>

      {isNewModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              New lead
            </h2>
            <form onSubmit={handleCreateQuote} className="space-y-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="createNewCustomer"
                  checked={isCreatingNewCustomer}
                  onChange={(e) => {
                    setIsCreatingNewCustomer(e.target.checked);
                    if (!e.target.checked) {
                      setNewCustomerName('');
                    } else {
                      setSelectedCustomerId('');
                    }
                  }}
                  className="rounded border-slate-300"
                />
                <label htmlFor="createNewCustomer" className="text-xs font-medium text-slate-600">
                  Create new customer organisation
                </label>
              </div>

              {isCreatingNewCustomer ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer organisation name
                  </span>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="Enter organisation name"
                    required={isCreatingNewCustomer}
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer organisation
                  </span>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                  >
                    <option value="">Select or create new...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Project title
                  </span>
                  <input
                    type="text"
                    value={newQuoteTitle}
                    onChange={(e) => setNewQuoteTitle(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="Project/Quote name"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer names
                  </span>
                  <input
                    type="text"
                    value={newQuoteClient}
                    onChange={(e) => setNewQuoteClient(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Value £
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={newQuoteValue}
                    onChange={(e) => setNewQuoteValue(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    SO Number
                  </span>
                  <input
                    type="text"
                    value={newQuoteSoNumber}
                    onChange={(e) => setNewQuoteSoNumber(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="SO-12345"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer email
                  </span>
                  <input
                    type="email"
                    value={newQuoteEmail}
                    onChange={(e) => setNewQuoteEmail(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="you@company.com"
                    required
                  />
                </label>
              </div>


              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Notes (optional)
                </span>
                <textarea
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                  placeholder="Add any additional notes about this lead..."
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Quote attachment (optional)
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={(e) =>
                    setNewQuoteFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                />
              </label>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (creating) return;
                    setIsNewModalOpen(false);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingQuote && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 overflow-y-auto py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-auto">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Edit Lead: {editingQuote.title}
            </h2>
            <form onSubmit={handleUpdateQuote} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Project title
                  </span>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer names
                  </span>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Value £
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    SO Number
                  </span>
                  <input
                    type="text"
                    value={editSoNumber}
                    onChange={(e) => setEditSoNumber(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="SO-12345"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer email
                  </span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                    placeholder="you@company.com"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Status
                  </span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Tender' | 'OTP')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                  >
                    <option value="Tender">Tender</option>
                    <option value="OTP">OTP</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Expected date
                  </span>
                  <input
                    type="date"
                    value={editNextChase}
                    onChange={(e) => setEditNextChase(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Last chased
                </span>
                <input
                  type="date"
                  value={editLastChased}
                  onChange={(e) => setEditLastChased(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Notes (optional)
                </span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2 resize-none"
                  placeholder="Add any additional notes about this lead..."
                />
              </label>

              {editingQuote.attachmentUrl && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">Current attachment</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={editingQuote.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      View attachment
                    </a>
                    {editingQuote.attachmentUrl.toLowerCase().endsWith('.pdf') && (
                      <button
                        type="button"
                        onClick={() => handleViewPdf(editingQuote.attachmentUrl!)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        | Preview PDF
                      </button>
                    )}
                  </div>
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  {editingQuote.attachmentUrl ? 'Replace attachment (optional)' : 'Add attachment (optional)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={(e) =>
                    setEditFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                />
              </label>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {updating ? 'Updating...' : 'Update Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/80 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">PDF Preview</h3>
              <button
                onClick={handleClosePdfPreview}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full min-h-[600px] border border-slate-200 rounded-lg"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

