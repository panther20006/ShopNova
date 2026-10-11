# ShopNova — Online Shopping WT Project

16-page responsive shopping project. HTML and PHP are completely separate.

## Run using XAMPP (Windows)
1. Extract this ZIP.
2. Copy the entire `ShopNova` folder into `C:\xampp\htdocs\`.
3. In XAMPP Control Panel, start Apache. MySQL is NOT needed.
4. Open http://localhost/ShopNova/public/index.html
5. Create an account using the Create account page. There are no default passwords.
6. Add products, open Cart, sign in, checkout, and inspect Your orders.

Requires PHP 8.1+ and PDO SQLite. If the page reports a server error, open XAMPP's php.ini and enable `extension=pdo_sqlite` and `extension=sqlite3` if disabled; restart Apache. Ensure `storage/` is writable by PHP. Never double-click the HTML files or use a static-only online HTML compiler for PHP features.

## Alternative: PHP development server
From the ShopNova folder:

```sh
php -S localhost:8000
```

Visit http://localhost:8000/public/index.html
Use only on your local machine. The built-in server is for development.

## Pages (16)
1. index.html — Home and featured products
2. products.html — Search, category filter, price sorting
3. categories.html — Six category collections
4. deals.html — Discounted sample catalogue
5. product.html — Product details and related products
6. cart.html — Quantity editing, removal and total
7. wishlist.html — Browser-persistent wishlist
8. checkout.html — Address validation and simulated COD order
9. login.html — Session-based sign in
10. register.html — Account registration
11. account.html — Profile and sign out
12. orders.html — Signed-in user's order history
13. order.html — Individual order details
14. about.html — Project introduction
15. contact.html — Database-persisted sample contact messages
16. faq.html — Help and usage questions

## Folder structure
- public/*.html: markup only; no embedded PHP
- public/assets/style.css: responsive styling
- public/assets/app.js: rendering, search, events, fetch API calls
- api/index.php: JSON-only PHP API, sessions, validation and database operations
- api/catalog.json: 24 sample products across 6 categories
- storage/: auto-created SQLite database; protected against Apache HTTP access
- PROJECT_NOTES.md: architecture, database and viva notes
- TEST_CHECKLIST.md: manual verification guide and performed checks

## Behaviour and scope
Accounts, orders, and contact messages persist in SQLite. Cart belongs to the PHP session. Wishlist belongs to this browser and is not account-specific. Logging out clears the session cart. Prices and totals are recomputed by PHP from the catalogue. Passwords are hashed, SQL uses prepared statements, mutations require CSRF tokens, and orders are filtered by signed-in user.

Product images are built-in emoji illustrations; no external image network is needed. Ratings, prices, discounts and stock indicators are sample data. No real payment, delivery, email, inventory reservation, refund, password recovery or admin dashboard is implemented. This is a classroom demonstration, not a production marketplace. For public deployment add HTTPS, request throttling, inventory transactions, deployment-specific access controls and a real payment integration.

## Reset demo data
Stop Apache/PHP, then delete storage/shop.sqlite and restart. This permanently removes demo accounts, orders and messages. Clear browser local storage to reset the wishlist.


## Front-end redesign (v2)
New navy/white storefront: header search with account menu, shop page with category/price/rating filters and grid/list view, cart with order summary, checkout, login/register with `?next=` redirect, and a user portal (Overview, Order history, order tracking, Wishlist) with Sign out available from the header menu and the portal sidebar. Only `public/assets/style.css` and `public/assets/app.js` changed; the PHP API and database are untouched.
Order status (Processing / Shipped / Delivered) is simulated from the order date.
