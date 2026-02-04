import React, { useEffect, useState } from 'react';
import { fetchCustomers, fetchCustomerById, type Customer, type CustomerWithQuotes } from '../api';
import type { QuoteCard } from './KanbanApp';

export const CustomersApp: React.FC<{ onNavigateToKanban: () => void }> = ({ onNavigateToKanban }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithQuotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

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

  const handleSelectCustomer = async (customer: Customer) => {
    try {
      const data = await fetchCustomerById(customer.id);
      setSelectedCustomer(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load customer details.');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStageColor = (stage: QuoteCard['stage']) => {
    const colors: Record<QuoteCard['stage'], string> = {
      new: 'bg-blue-100 text-blue-700',
      follow_up: 'bg-yellow-100 text-yellow-700',
      tender: 'bg-orange-100 text-orange-700',
      won: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700'
    };
    return colors[stage] || 'bg-slate-100 text-slate-700';
  };

  const getStageName = (stage: QuoteCard['stage']) => {
    const names: Record<QuoteCard['stage'], string> = {
      new: 'New',
      follow_up: 'Follow-up',
      tender: 'Tender',
      won: 'Won',
      lost: 'Lost'
    };
    return names[stage] || stage;
  };

  if (selectedCustomer) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {selectedCustomer.name}
                </h1>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.quotes.length} project{selectedCustomer.quotes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToKanban}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Kanban View
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {selectedCustomer.quotes.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500">No projects found for this customer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {selectedCustomer.quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition"
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      {quote.title}
                    </h3>
                    <p className="text-xs text-slate-600 mb-2">
                      {quote.clientName}
                    </p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${getStageColor(quote.stage)}`}>
                      {getStageName(quote.stage)}
                    </span>
                  </div>

                  {quote.value != null && (
                    <p className="text-xs text-slate-500 mb-2">
                      Value:{' '}
                      <span className="font-semibold text-slate-800">
                        £{quote.value.toLocaleString()}
                      </span>
                    </p>
                  )}

                  {quote.status && (
                    <p className="text-xs text-slate-500 mb-2">
                      Status: <span className="font-medium">{quote.status}</span>
                    </p>
                  )}

                  {quote.notes && (
                    <div className="mt-2 rounded-md bg-slate-50 p-2">
                      <p className="line-clamp-3 text-[11px] text-slate-600">
                        {quote.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div>
                      <span className="text-slate-400">Last chased:</span>{' '}
                      {quote.lastChasedAt
                        ? new Date(quote.lastChasedAt).toLocaleDateString()
                        : 'Never'}
                    </div>
                    {quote.nextChaseAt && (
                      <div>
                        <span className="text-slate-400">Next:</span>{' '}
                        {new Date(quote.nextChaseAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {quote.attachmentUrl && (
                    <a
                      href={quote.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      View attachment
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

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
                Customers
              </h1>
              <p className="text-xs text-slate-500">
                View all customer organisations and their projects
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToKanban}
            className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Kanban View
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:shadow-md transition text-left w-full"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  {customer.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Created {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
