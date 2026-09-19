export type Book = {
  id: string
  title: string
  authors: string[]
  coverImageUrl?: string
  isbn?: string
  publisher?: string
  publicationYear?: number
  pageCount?: number
  startDate: string
  endDate: string
  isFavourite: boolean
  createdAt: string
}

const databaseName = 'bookshelf'
const storeName = 'books'
const metadataStoreName = 'metadata'
const dummyBookIds = ['seed-the-night-circus', 'seed-piranesi', 'seed-kitchen']
const remoteUrl = import.meta.env.VITE_BOOKSHELF_API_URL as string | undefined
const remoteToken = import.meta.env.VITE_BOOKSHELF_API_TOKEN as string | undefined

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(metadataStoreName)) request.result.createObjectStore(metadataStoreName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readAll(): Promise<Book[]> {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result as Book[])
    request.onerror = () => reject(request.error)
  }))
}

function write(book: Book) {
  return openDatabase().then((db) => new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(book)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  }))
}

async function removeDummyBooks() {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    for (const id of dummyBookIds) transaction.objectStore(storeName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getBooks() {
  if (remoteUrl && remoteToken) {
    const response = await fetch(`${remoteUrl}?token=${encodeURIComponent(remoteToken)}`)
    if (!response.ok) throw new Error('Shared bookshelf could not be loaded')
    const books = await response.json() as Book[]
    if (books.length > 0) return books
    await removeDummyBooks()
    const localBooks = await readAll()
    if (localBooks.length > 0) await remoteRequest({ action: 'import', books: localBooks })
    return localBooks
  }
  await removeDummyBooks()
  return readAll()
}

export async function saveBook(book: Book) {
  if (remoteUrl && remoteToken) return remoteRequest({ action: 'upsert', book })
  await write(book)
}

export async function removeBook(id: string) {
  if (remoteUrl && remoteToken) return remoteRequest({ action: 'delete', id })
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function importBooks(books: Book[]) {
  if (remoteUrl && remoteToken) return remoteRequest({ action: 'import', books })
  for (const book of books) await write(book)
}

async function remoteRequest(payload: Record<string, unknown>) {
  const response = await fetch(remoteUrl as string, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, token: remoteToken }) })
  if (!response.ok) throw new Error('Shared bookshelf request failed')
  const result = await response.json() as { error?: string }
  if (result.error) throw new Error(result.error)
}