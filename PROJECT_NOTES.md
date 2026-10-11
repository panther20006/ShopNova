# WT Project Notes

## Objective
Build a multi-page shopping experience using HTML, CSS, JavaScript and PHP with clear frontend/backend separation.

## Request flow
Browser opens an HTML page → app.js calls ../api/index.php → PHP validates request and session → SQLite reads/writes records → JSON response → JavaScript updates the page.

## Technologies
HTML5 semantic page containers, CSS Grid/Flexbox and media queries, JavaScript DOM/events/localStorage/fetch, PHP sessions/password_hash/password_verify/PDO, SQLite relational storage.

## Database
users: id (PK), name, email (unique), password (hash).
orders: id (PK), user_id (FK), items (JSON snapshot), total (integer INR), address, created (UTC ISO timestamp).
messages: id (PK), name, email, message, created.
Products are seeded in api/catalog.json. Order snapshots preserve purchased names, quantities and prices.

## API
GET bootstrap: catalogue, current account, session cart and CSRF token.
GET orders: orders for the authenticated account only.
POST register: name, email, password.
POST login: email, password.
POST logout: clear session.
POST cart: id, quantity (0 removes; maximum 10).
POST checkout: address, phone, pincode; creates a simulated COD order.
POST contact: name, email, message; stores a demo contact request.
POST requests send the bootstrap token in X-CSRF-Token.

## Viva questions
Q: Why separate HTML and PHP? A: Presentation and server logic have separate responsibilities and can be maintained independently.
Q: What is fetch? A: A browser API for HTTP requests; here it exchanges JSON with PHP.
Q: Session vs localStorage? A: Sessions keep server-side state linked to a cookie. localStorage stores data in the browser.
Q: Why prepared statements? A: They bind values separately from SQL syntax to prevent SQL injection.
Q: Why password hashing? A: Authentication verifies a one-way password hash without storing the original password.
Q: Why calculate totals in PHP? A: Browser values can be modified; the server must use its own product prices.
Q: What is CSRF? A: Forged requests made through a user's authenticated browser. A session-specific token helps reject them.
Q: How is another user's order protected? A: The orders query restricts results to the session user's ID.
Q: Is this MySQL? A: No. SQLite uses a local database file; PDO is the database access interface.
