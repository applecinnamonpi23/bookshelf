export type Book = {
  id: string
  title: string
  authors: string[]
  coverImageUrl?: string
  isbn?: string
  publisher?: string
  publicationYear?: number
  wordCount?: number
  startDate: string
  endDate: string
  isFavourite: boolean
  createdAt: string
}

const databaseName = 'bookshelf'
const storeName = 'books'
const metadataStoreName = 'metadata'
const initializedKey = 'seeded'
const dummyBookIds = ['seed-the-night-circus', 'seed-piranesi', 'seed-kitchen']

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

function isInitialized(): Promise<boolean> {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const request = db.transaction(metadataStoreName, 'readonly').objectStore(metadataStoreName).get(initializedKey)
    request.onsuccess = () => resolve(Boolean(request.result))
    request.onerror = () => reject(request.error)
  }))
}

function markInitialized() {
  return openDatabase().then((db) => new Promise<void>((resolve, reject) => {
    const request = db.transaction(metadataStoreName, 'readwrite').objectStore(metadataStoreName).put(true, initializedKey)
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
  await removeDummyBooks()
  return readAll()
}

export async function saveBook(book: Book) {
  await write(book)
}

export async function removeBook(id: string) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function importBooks(books: Book[]) {
  for (const book of books) await write(book)
}