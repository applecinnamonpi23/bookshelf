const SHEET_NAME = 'Books'
const HEADERS = ['id', 'title', 'authors', 'coverImageUrl', 'isbn', 'publisher', 'publicationYear', 'pageCount', 'startDate', 'endDate', 'isFavourite', 'createdAt']

function doGet(request) {
  try {
    authorize_(request.parameter.token)
    const sheet = getSheet_()
    const values = sheet.getDataRange().getValues()
    if (values.length <= 1) return json_([])
    return json_(values.slice(1).map(rowToBook_))
  } catch (error) {
    return json_({ error: error.message })
  }
}

function doPost(request) {
  try {
    const body = JSON.parse(request.postData.contents)
    authorize_(body.token)
    if (body.action === 'upsert') upsertBook_(body.book)
    else if (body.action === 'delete') deleteBook_(body.id)
    else if (body.action === 'import') body.books.forEach(upsertBook_)
    else throw new Error('Unknown action')
    return json_({ ok: true })
  } catch (error) {
    return json_({ error: error.message })
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(SHEET_NAME)
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME)
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS)
  return sheet
}

function upsertBook_(book) {
  const sheet = getSheet_()
  const values = sheet.getDataRange().getValues()
  const row = [book.id, book.title, (book.authors || []).join('|'), book.coverImageUrl || '', book.isbn || '', book.publisher || '', book.publicationYear || '', book.pageCount || '', book.startDate, book.endDate, Boolean(book.isFavourite), book.createdAt]
  const index = values.findIndex((current, position) => position > 0 && String(current[0]) === String(book.id))
  if (index === -1) sheet.appendRow(row)
  else sheet.getRange(index + 1, 1, 1, HEADERS.length).setValues([row])
}

function deleteBook_(id) {
  const sheet = getSheet_()
  const values = sheet.getDataRange().getValues()
  for (let index = values.length - 1; index > 0; index -= 1) {
    if (String(values[index][0]) === String(id)) sheet.deleteRow(index + 1)
  }
}

function rowToBook_(row) {
  return { id: String(row[0]), title: String(row[1]), authors: String(row[2] || '').split('|').filter(Boolean), coverImageUrl: String(row[3] || '') || undefined, isbn: String(row[4] || '') || undefined, publisher: String(row[5] || '') || undefined, publicationYear: row[6] ? Number(row[6]) : undefined, pageCount: row[7] ? Number(row[7]) : undefined, startDate: normalizeDate_(row[8]), endDate: normalizeDate_(row[9]), isFavourite: row[10] === true || String(row[10]).toLowerCase() === 'true', createdAt: String(row[11]) }
}

function normalizeDate_(value) {
  if (!value) return ''
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd')
}

function authorize_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('BOOKSHELF_TOKEN')
  if (!expected || token !== expected) throw new Error('Unauthorized')
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)
}
