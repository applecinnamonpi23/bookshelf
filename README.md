# Bookshelf

A personal bookshelf for tracking completed books with cover-focused browsing,
reading dates, and favourites.

## Product Requirements

### Goal

Make it quick and pleasant to record completed books and revisit the collection
visually.

### Core Features

1. **Completed-book collection**
	- The bookshelf contains books that I have finished reading.
	- Unfinished or currently reading books are outside the initial product scope.

2. **Cover-first display**
	- Books are represented primarily by their cover images, not by a plain text list.
	- Each book should still expose its title and author when selected or inspected.

3. **Search-to-add workflow**
	- The main action is adding a completed book.
	- I search by book title.
	- Search results identify the correct edition where possible using book metadata such as ISBN, title, author, publisher, and cover image.
	- Selecting a result adds it to the bookshelf and collects its reading dates.

4. **Reading statistics**
	- Each book stores a start date and an end date.
	- The book detail view displays these dates and can show derived reading duration.

5. **Recent-first sorting**
	- The default bookshelf order is most recently completed first, based on the end date.

6. **Bookshelf visual style**
	- The main view should feel like a real bookshelf rather than a grid or plain list.
	- Covers should have varied, uneven spacing while remaining easy to scan and use.

7. **Favourites**
	- A book can be marked or unmarked as a favourite.
	- A separate view or filter shows favourite books only.

## Primary User Flow

1. Open the bookshelf and see completed books, with the most recently finished first.
2. Choose **Add book**.
3. Search for a title.
4. Review matching books and confirm the correct edition.
5. Enter the start and end dates.
6. Save the book.
7. See the new cover placed on the bookshelf.
8. Optionally mark the book as a favourite and browse the favourites view.

## Initial Data Model

Each saved book should include:

- `id`: internal identifier
- `title`
- `authors`
- `coverImageUrl`
- `isbn`, when available
- `publisher` and publication year, when available
- `startDate`
- `endDate`
- `isFavourite`
- `createdAt`

The external book service is a discovery source. The selected book metadata
should be stored locally so the bookshelf remains stable if search results later
change.

## Incremental Implementation Plan

### Phase 1: Walking Skeleton

- Choose the application stack and create the basic app structure.
- Add a local book model and seed a few completed books.
- Render a responsive cover-based bookshelf.
- Sort seeded books by most recent `endDate`.

**Checkpoint:** I can open the app and browse a visual bookshelf of completed books.

### Phase 2: Book Details and Dates

- Add a book detail panel or page.
- Display title, author, cover, start date, end date, and reading duration.
- Add validation so completed books require an end date and the end date is not before the start date.

**Checkpoint:** Every displayed book has trustworthy completion data.

### Phase 3: Search and Add

- Select an external book database API that provides title search, authors, covers, and ISBNs.
- Build the search interface with loading, empty, and error states.
- Display enough metadata to distinguish editions.
- Add the selected result to the local collection after the user enters reading dates.

**Checkpoint:** I can search for a title, select the correct result, and add it to the bookshelf.

### Phase 4: Persistence

- Replace temporary in-memory data with a persistent backend or database.
- Add create, read, update, and delete operations for saved books.
- Keep external API credentials on the backend when required.
- Handle duplicate books and unavailable cover images gracefully.

**Checkpoint:** Books remain available after restarting the app.

### Phase 5: Favourites and Views

- Add a favourite toggle to the book detail view and bookshelf items.
- Add a favourites-only view or filter.
- Preserve recent-first ordering in both the main and favourites views.

**Checkpoint:** I can mark favourites and browse only those books.

### Phase 6: Bookshelf Polish

- Refine the bookshelf composition with uneven spacing, varied shelf placement, and responsive behavior.
- Add keyboard and mobile-friendly interactions.
- Add accessible labels, focus states, and fallback text for covers.
- Test empty, loading, error, duplicate, and large-collection states.

**Checkpoint:** The bookshelf feels distinctive and remains usable across screen sizes.

## MVP Scope

The first usable release should include Phases 1 through 3: a cover-based
bookshelf, completed-book dates, and search-to-add using an external book
database. Persistence and favourites follow immediately after the core workflow
is proven.

## Open Decisions

- Which book database API should be used, and does it require an API key?
- Should the first version use a local database, hosted backend, or browser storage?
- Can a book be added more than once for rereads, or should each title appear only once?
- Should users be able to edit or delete a saved book after adding it?
- What should happen when the API returns multiple editions or no cover image?
