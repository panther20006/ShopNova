# Verification

Performed in the creation environment:
- JavaScript syntax: node --check passed.
- Verified 16 separate HTML pages exist.
- Verified HTML pages contain no PHP tags and PHP contains no HTML templates.
- Checked local HTML/CSS/JS file links and catalogue IDs.

Limit: PHP is not installed in the creation environment. PHP syntax, database execution and end-to-end browser behaviour were not runtime-tested here.

Run these checks after starting XAMPP:
1. Home opens; all 24 products appear under All products.
2. Search, category selection and both price sorts work.
3. Register; duplicate email is rejected. Sign out, then sign in.
4. Wrong password fails. Signed-out Orders prompts sign-in.
5. Add item, update quantity, remove it; total stays correct.
6. Save wishlist item; reload browser and verify it remains.
7. Checkout rejects invalid phone, PIN and short address.
8. Place demo order; cart clears and order details show matching total.
9. Reload Orders; the order persists.
10. Register a second account; it cannot view the first account's order.
11. Submit contact message; inspect messages table locally if desired.
12. Check pages at 390px, 768px and desktop width.
13. Refresh after restarting PHP; account/order data remains on disk.
14. Direct POST without CSRF header is rejected with HTTP 403.
