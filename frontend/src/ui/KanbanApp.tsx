import React, { useEffect, useMemo, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from '@hello-pangea/dnd';
import { createQuote, fetchQuotes, updateQuoteStage, uploadQuoteAttachment } from '../api';

type StageKey = 'new' | 'sent' | 'follow_up' | 'negotiation' | 'won' | 'lost';

export type QuoteCard = {
  id: string;
  title: string;
  clientName: string;
  value?: number;
  stage: StageKey;
  lastChasedAt?: string;
  nextChaseAt?: string;
  reminderEmail?: string;
  attachmentUrl?: string;
  status?: 'Tender' | 'OTP';
};

const STAGES: { id: StageKey; title: string }[] = [
  { id: 'new', title: 'New' },
  { id: 'sent', title: 'Sent' },
  { id: 'follow_up', title: 'Follow-up' },
  { id: 'negotiation', title: 'Negotiation' },
  { id: 'won', title: 'Won' },
  { id: 'lost', title: 'Lost' }
];

export const KanbanApp: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteCard[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newQuoteTitle, setNewQuoteTitle] = useState('');
  const [newQuoteClient, setNewQuoteClient] = useState('');
  const [newQuoteValue, setNewQuoteValue] = useState<string>('');
  const [newQuoteEmail, setNewQuoteEmail] = useState('');
  const [newQuoteNextChase, setNewQuoteNextChase] = useState('');
  const [newQuoteFile, setNewQuoteFile] = useState<File | null>(null);
  const [newQuoteStatus, setNewQuoteStatus] = useState<'Tender' | 'OTP'>('Tender');

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
        acc[stage.id] = filteredQuotes.filter((q) => q.stage === stage.id);
        return acc;
      }, {} as Record<StageKey, QuoteCard[]>),
    [filteredQuotes]
  );

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const stageId = destination.droppableId as StageKey;
    // optimistic update
    setQuotes((prev) =>
      prev.map((q) => (q.id === draggableId ? { ...q, stage: stageId } : q))
    );
    try {
      await updateQuoteStage(draggableId, stageId);
    } catch (err) {
      console.error(err);
      setError('Unable to update quote stage.');
    }
  };

  const resetNewQuoteForm = () => {
    setNewQuoteTitle('');
    setNewQuoteClient('');
    setNewQuoteValue('');
    setNewQuoteEmail('');
    setNewQuoteNextChase('');
    setNewQuoteFile(null);
    setNewQuoteStatus('Tender');
  };

  const handleOpenNewModal = () => {
    resetNewQuoteForm();
    setIsNewModalOpen(true);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteTitle.trim() || !newQuoteClient.trim()) {
      setError('Please enter organisation and customer name.');
      return;
    }

    setCreating(true);
    try {
      const valueNumber = newQuoteValue ? Number(newQuoteValue) : undefined;
      const payload: Partial<QuoteCard> = {
        title: newQuoteTitle.trim(),
        clientName: newQuoteClient.trim(),
        value: Number.isNaN(valueNumber) ? undefined : valueNumber,
        stage: 'new',
        reminderEmail: newQuoteEmail || undefined,
        nextChaseAt: newQuoteNextChase ? new Date(newQuoteNextChase).toISOString() : undefined,
        status: newQuoteStatus
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
    } catch (err) {
      console.error(err);
      setError('Unable to create quote. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <span className="text-lg font-semibold">QP</span>
            </div>
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
              onClick={handleOpenNewModal}
              disabled={creating}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-60"
            >
              New lead
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
        {loading ? (
          <p className="text-sm text-slate-500">Loading quotes...</p>
        ) : null}
        <DragDropContext onDragEnd={onDragEnd}>
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
                                {...dragProvided.dragHandleProps}
                                className={`group rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md cursor-grab active:cursor-grabbing ${
                                  dragSnapshot.isDragging
                                    ? 'ring-blue-500 shadow-lg opacity-90'
                                    : ''
                                }`}
                              >
                                <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-slate-900">
                                  {quote.title}
                                </h3>
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
                                {quote.attachmentUrl && (
                                  <a
                                    href={quote.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    View quote
                                  </a>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Customer organisation
                  </span>
                  <input
                    type="text"
                    value={newQuoteTitle}
                    onChange={(e) => setNewQuoteTitle(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Status
                  </span>
                  <select
                    value={newQuoteStatus}
                    onChange={(e) => setNewQuoteStatus(e.target.value as 'Tender' | 'OTP')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
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
                    value={newQuoteNextChase}
                    onChange={(e) => setNewQuoteNextChase(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-brand-500/0 transition focus:bg-white focus:ring-2"
                  />
                </label>
              </div>

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
    </div>
  );
};

