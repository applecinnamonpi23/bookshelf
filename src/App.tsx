import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getBooks, importBooks, removeBook, saveBook } from './db'
import type { Book } from './db'
import './App.css'

type SearchBook = Omit<Book, 'id' | 'startDate' | 'endDate' | 'isFavourite' | 'createdAt'>
type IconProps = { size?: number; className?: string; fill?: string }
const Glyph = ({ symbol, size = 18, className = '' }: IconProps & { symbol: string }) => <span className={`glyph ${className}`} style={{ fontSize: size }} aria-hidden="true">{symbol}</span>
const BookOpen = (props: IconProps) => <Glyph {...props} symbol="▤" />
const Check = (props: IconProps) => <Glyph {...props} symbol="✓" />
const ChevronRight = (props: IconProps) => <Glyph {...props} symbol="›" />
const Download = (props: IconProps) => <Glyph {...props} symbol="↓" />
const Heart = (props: IconProps) => <Glyph {...props} symbol={props.fill === 'currentColor' ? '♥' : '♡'} />
const Library = (props: IconProps) => <Glyph {...props} symbol="▥" />
const Pencil = (props: IconProps) => <Glyph {...props} symbol="✎" />
const Plus = (props: IconProps) => <Glyph {...props} symbol="+" />
const Search = (props: IconProps) => <Glyph {...props} symbol="⌕" />
const Trash2 = (props: IconProps) => <Glyph {...props} symbol="⌫" />
const Upload = (props: IconProps) => <Glyph {...props} symbol="↑" />
const X = (props: IconProps) => <Glyph {...props} symbol="×" />
const PanelToggle = (props: IconProps) => <Glyph {...props} symbol="☰" />

const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
const readingDays = (book: Book) => Math.max(1, Math.round((new Date(`${book.endDate}T00:00:00`).getTime() - new Date(`${book.startDate}T00:00:00`).getTime()) / 86400000) + 1)
const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ')
const formatNumber = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [activeView, setActiveView] = useState<'all' | 'favourites'>('all')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchBook[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [addingBook, setAddingBook] = useState<SearchBook | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('bookshelf-sidebar-collapsed') === 'true')
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => { getBooks().then(setBooks) }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=6&fields=title`, { signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        setSuggestions([...new Set(data.docs.map((item: { title?: string }) => item.title).filter(Boolean))].slice(0, 6) as string[])
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      }
    }, 250)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query])

  const visibleBooks = books.filter((book) => activeView === 'all' || book.isFavourite).sort((a, b) => b.endDate.localeCompare(a.endDate))
  const firstReadingDate = books.length ? Math.min(...books.map((book) => new Date(`${book.startDate}T00:00:00`).getTime())) : 0
  const lastReadingDate = books.length ? Math.max(...books.map((book) => new Date(`${book.endDate}T00:00:00`).getTime())) : 0
  const elapsedWeeks = books.length ? Math.max(1, (lastReadingDate - firstReadingDate) / 604800000) : 0
  const totalWords = books.reduce((total, book) => total + (book.wordCount ?? 0), 0)
  const booksPerWeek = elapsedWeeks ? books.length / elapsedWeeks : 0
  const wordsPerWeek = elapsedWeeks ? totalWords / elapsedWeeks : 0
  const persist = async (book: Book) => { await saveBook(book); setBooks((current) => [...current.filter((item) => item.id !== book.id), book]); setSelectedBook(book) }

  const searchBooks = async (searchTerm = query) => {
    if (!searchTerm.trim()) return
    setQuery(searchTerm)
    setSuggestions([])
    setIsSearching(true); setSearchError('')
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=8&fields=key,title,author_name,isbn,publisher,first_publish_year,cover_i`)
      if (!response.ok) throw new Error('Search unavailable')
      const data = await response.json()
      setSearchResults(data.docs.map((item: Record<string, unknown>, index: number) => ({
        title: String(item.title ?? 'Untitled'),
        authors: Array.isArray(item.author_name) ? item.author_name.slice(0, 3) as string[] : ['Unknown author'],
        coverImageUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined,
        isbn: Array.isArray(item.isbn) ? String(item.isbn[0]) : undefined,
        publisher: Array.isArray(item.publisher) ? String(item.publisher[0]) : undefined,
        publicationYear: typeof item.first_publish_year === 'number' ? item.first_publish_year : undefined,
        id: String(item.key ?? index),
      })))
    } catch { setSearchError('Open Library could not be reached. Try again in a moment.') } finally { setIsSearching(false) }
  }

  const addBook = async (startDate: string, endDate: string, wordCount?: number) => {
    if (!addingBook || !startDate || !endDate || endDate < startDate) return
    const duplicate = books.find((book) => normalizeTitle(book.title) === normalizeTitle(addingBook.title))
    if (duplicate) { setAddingBook(null); setSelectedBook(duplicate); return }
    const book: Book = { ...addingBook, wordCount, id: crypto.randomUUID(), startDate, endDate, isFavourite: false, createdAt: new Date().toISOString() }
    await persist(book); setAddingBook(null); setSearchResults([]); setQuery('')
  }

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'bookshelf-backup.json'; link.click(); URL.revokeObjectURL(url)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = JSON.parse(await file.text()) as Book[]
      if (!Array.isArray(imported) || imported.some((book) => !book.id || !book.title)) throw new Error()
      await importBooks(imported); setBooks(imported)
    } catch { window.alert('That file is not a valid bookshelf backup.') }
    event.target.value = ''
  }

  const toggleFavourite = async (book: Book) => persist({ ...book, isFavourite: !book.isFavourite })
  const deleteSelected = async () => {
    if (!selectedBook || !window.confirm(`Delete “${selectedBook.title}” from your bookshelf?`)) return
    await removeBook(selectedBook.id); setBooks((current) => current.filter((book) => book.id !== selectedBook.id)); setSelectedBook(null)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed
      localStorage.setItem('bookshelf-sidebar-collapsed', String(next))
      return next
    })
  }

  return <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <aside className="sidebar">
      <div className="brand-row"><div className="brand"><span className="brand-mark"><Library size={18} /></span><span className="brand-name">bookshelf</span></div><button className="sidebar-toggle icon-button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelToggle size={18} /></button></div>
      <nav aria-label="Bookshelf views">
        <button className={activeView === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('all')} title="All books"><BookOpen size={17} /> <span className="nav-label">All books</span><span>{books.length}</span></button>
        <button className={activeView === 'favourites' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('favourites')} title="Favourites"><Heart size={17} /> <span className="nav-label">Favourites</span><span>{books.filter((book) => book.isFavourite).length}</span></button>
      </nav>
      <div className="sidebar-bottom"><button className="text-action" onClick={exportData} title="Export backup"><Download size={15} /> <span className="nav-label">Export backup</span></button><button className="text-action" onClick={() => importInput.current?.click()} title="Import backup"><Upload size={15} /> <span className="nav-label">Import backup</span></button><input ref={importInput} type="file" accept="application/json" hidden onChange={handleImport} /></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">Personal reading archive</p><h1>My bookshelf</h1></div></header>
      <section className="metrics" aria-label="Reading metrics"><Metric label="Books read" value={books.length.toString()} /><Metric label="Words read" value={totalWords ? formatNumber(totalWords) : '—'} /><Metric label="Books / week" value={booksPerWeek ? booksPerWeek.toFixed(1) : '—'} /><Metric label="Words / week" value={wordsPerWeek ? formatNumber(wordsPerWeek) : '—'} /></section>
      <section className="search-panel" aria-label="Search for a book"><div className="search-copy"><p className="eyebrow">Add a finished book</p><h2>What did you read?</h2><p>Search Open Library, choose the right edition, and add your reading dates.</p></div><div className="search-area"><form className="search-box" onSubmit={(event: FormEvent) => { event.preventDefault(); searchBooks() }}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title" aria-label="Search by title" autoComplete="off" /><button type="submit" disabled={isSearching}>{isSearching ? 'Searching' : 'Search'} <ChevronRight size={16} /></button></form>{suggestions.length > 0 && <div className="suggestions" role="listbox" aria-label="Book title suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => searchBooks(suggestion)}>{suggestion}</button>)}</div>}</div></section>
      {(searchResults.length > 0 || searchError) && <section className="results-panel"><div className="section-heading"><div><p className="eyebrow">Open Library results</p><h2>Choose an edition</h2></div><button className="icon-button" onClick={() => { setSearchResults([]); setSearchError('') }} aria-label="Close search results"><X size={18} /></button></div>{searchError && <p className="error-message">{searchError}</p>}<div className="results-grid">{searchResults.map((result) => <button className="result-card" key={`${result.title}-${result.isbn}`} onClick={() => setAddingBook(result)}><Cover book={result} /><span><strong>{result.title}</strong><small>{result.authors.join(', ')}</small><small>{[result.publisher, result.publicationYear, result.isbn].filter(Boolean).join(' · ') || 'Edition details unavailable'}</small></span><Plus size={18} /></button>)}</div></section>}
      <section className="shelf-section"><div className="section-heading"><div><p className="eyebrow">{activeView === 'all' ? 'Recently completed' : 'Saved favourites'}</p>{activeView === 'favourites' && <h2>Books worth returning to</h2>}</div></div>{visibleBooks.length === 0 ? <div className="empty-state"><BookOpen size={28} /><h3>{activeView === 'all' ? 'Your shelf is empty' : 'No favourites yet'}</h3><p>{activeView === 'all' ? 'Search above to add your first finished book.' : 'Tap the heart on a book to keep it close.'}</p></div> : <div className="shelf-grid">{visibleBooks.map((book) => <button className="book-card" key={book.id} onClick={() => setSelectedBook(book)}><Cover book={book} />{book.isFavourite && <Heart className="favourite-badge" size={15} fill="currentColor" />}</button>)}</div>}</section>
    </main>
    {selectedBook && <aside className="detail-drawer" aria-label="Book details"><button className="drawer-close icon-button" onClick={() => setSelectedBook(null)} aria-label="Close book details"><X size={18} /></button><Cover book={selectedBook} large /><div className="drawer-content"><p className="eyebrow">Book details</p><h2>{selectedBook.title}</h2><p className="author-line">{selectedBook.authors.join(', ')}</p><button className="favourite-button" onClick={() => toggleFavourite(selectedBook)}><Heart size={17} fill={selectedBook.isFavourite ? 'currentColor' : 'none'} /> {selectedBook.isFavourite ? 'Saved as favourite' : 'Add to favourites'}</button><dl className="detail-list"><div><dt>Finished</dt><dd>{formatDate(selectedBook.endDate)}</dd></div><div><dt>Reading time</dt><dd>{readingDays(selectedBook)} days</dd></div><div><dt>Edition</dt><dd>{[selectedBook.publisher, selectedBook.publicationYear, selectedBook.isbn].filter(Boolean).join(' · ') || 'Not recorded'}</dd></div></dl><div className="drawer-actions"><button className="secondary-button" onClick={() => setEditingBook(selectedBook)}><Pencil size={16} /> Edit book</button><button className="danger-button" onClick={deleteSelected}><Trash2 size={16} /> Delete</button></div></div></aside>}
    {addingBook && <DateModal title={`Add “${addingBook.title}”`} onClose={() => setAddingBook(null)} onSave={addBook} />}
    {editingBook && <EditModal book={editingBook} onClose={() => setEditingBook(null)} onSave={async (book) => { await persist(book); setEditingBook(null) }} />}
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function Cover({ book, large = false }: { book: Partial<Book>; large?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  const fallback = <span className={large ? 'book-cover fallback large' : 'book-cover fallback'}><BookOpen size={large ? 30 : 21} /><b>{book.title}</b></span>
  return book.coverImageUrl && !imageFailed ? <img className={large ? 'book-cover large' : 'book-cover'} src={book.coverImageUrl} alt={`Cover of ${book.title}`} onError={() => setImageFailed(true)} /> : fallback
}

function DateModal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (start: string, end: string, wordCount?: number) => void }) {
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [wordCount, setWordCount] = useState('')
  return <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); onSave(start, end, wordCount ? Number(wordCount) : undefined) }}><button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Reading dates</p><h2>{title}</h2><p className="modal-copy">When did you start and finish this book?</p><label>Started<input type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label><label>Finished<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required /></label><label>Word count <span className="optional">optional</span><input type="number" min="0" step="1" value={wordCount} onChange={(event) => setWordCount(event.target.value)} placeholder="e.g. 80000" /></label><button className="primary-button" type="submit"><Check size={16} /> Save to bookshelf</button></form></div>
}

function EditModal({ book, onClose, onSave }: { book: Book; onClose: () => void; onSave: (book: Book) => void }) {
  const [title, setTitle] = useState(book.title); const [start, setStart] = useState(book.startDate); const [end, setEnd] = useState(book.endDate); const [wordCount, setWordCount] = useState(book.wordCount?.toString() ?? '')
  return <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); onSave({ ...book, title: title.trim() || book.title, startDate: start, endDate: end, wordCount: wordCount ? Number(wordCount) : undefined }) }}><button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Edit entry</p><h2>Keep the details current</h2><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>Started<input type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label><label>Finished<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required /></label><label>Word count <span className="optional">optional</span><input type="number" min="0" step="1" value={wordCount} onChange={(event) => setWordCount(event.target.value)} placeholder="e.g. 80000" /></label><button className="primary-button" type="submit"><Check size={16} /> Save changes</button></form></div>
}

export default App
