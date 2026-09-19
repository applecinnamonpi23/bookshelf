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

const seedBooks: Book[] = [
  { id: 'seed-the-night-circus', title: 'The Night Circus', authors: ['Erin Morgenstern'], coverImageUrl: 'https://covers.openlibrary.org/isbn/9780307744432-L.jpg', isbn: '9780307744432', publisher: 'Vintage', publicationYear: 2012, startDate: '2026-01-06', endDate: '2026-01-19', isFavourite: true, createdAt: '2026-01-19T19:00:00.000Z' },
  { id: 'seed-piranesi', title: 'Piranesi', authors: ['Susanna Clarke'], coverImageUrl: 'https://covers.openlibrary.org/isbn/9781635575637-L.jpg', isbn: '9781635575637', publisher: 'Bloomsbury', publicationYear: 2020, startDate: '2026-02-02', endDate: '2026-02-08', isFavourite: false, createdAt: '2026-02-08T19:00:00.000Z' },
  { id: 'seed-kitchen', title: 'Kitchen', authors: ['Banana Yoshimoto'], coverImageUrl: 'https://covers.openlibrary.org/isbn/9780802142444-L.jpg', isbn: '9780802142444', publisher: 'Grove Press', publicationYear: 1994, startDate: '2026-03-04', endDate: '2026-03-07', isFavourite: true, createdAt: '2026-03-07T19:00:00.000Z' },
]

export async function getBooks() {
  const books = await readAll()
  if (books.length > 0) {
    if (!await isInitialized()) await markInitialized()
    return books
  }
  if (await isInitialized()) return books
  for (const book of seedBooks) await write(book)
  await markInitialized()
  return seedBooks
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