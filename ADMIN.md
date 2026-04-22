# Site admin (author only)

The admin UI lives at **`/admin.html`**. It is not linked from the public navigation; [`robots.txt`](robots.txt) disallows crawlers from indexing it.

## Security (GitHub Pages)

Authentication is a **password hash in the browser** ([`js/admin.js`](js/admin.js), `ADMIN_HASH`). Anyone who can read your published JavaScript can attempt offline guessing. Use a **long, unique password** and treat this as a convenience gate, not bank-grade security. For stronger isolation, put `/admin.html` behind **Cloudflare Zero Trust**, **Netlify Identity**, or similar, or do not deploy `admin.html` to production and run it locally only.

## First login and rotating the password

1. **Bootstrap sign-in** (replace immediately): password `BootstrapChanna2026!ChangeMe` — matches the default `ADMIN_HASH` in `js/admin.js` until you change it.
2. To change the password, pick a new secret string and set `ADMIN_HASH` to its SHA-256 **hex** (64 characters):

   ```bash
   printf '%s' 'YOUR_NEW_LONG_PASSWORD' | shasum -a 256
   ```

   On Linux you can use `sha256sum` instead of `shasum`.

3. Commit the updated `js/admin.js`. Do **not** commit the plain password.

## Publishing posts

Posts edited in the dashboard live in **`localStorage`** (`channa:posts`) until you use **Export post HTML** and add the file under `blog/` in this repository, then push to GitHub. Use **Export all JSON** regularly as a backup.

## Drafts

Posts marked **Draft** stay out of the home “Stories” feed and the blog list merge ([`js/posts-loader.js`](js/posts-loader.js)); you can still open them via **Preview** or from the admin list.

## Dashboard behavior

- **Auto-save:** After you stop typing for a few seconds, the current post is saved to `localStorage` if it has a title (same data as **Save to browser**).
- **Images:** Upload, image URL, **paste** an image while the cursor is in the body field, or **drag** an image file onto the body field. Very large embedded images trigger a warning because `localStorage` is small (~5 MB for the whole origin).
- **Duplicate post:** Copies the open form into a new post with “(copy)” in the title and `-copy` on the slug (edit before publishing).

## Images and storage limit

`localStorage` is small (on the order of **5 MB** total for the origin). Large **base64** images in the HTML body fill it quickly. Prefer **repo paths** for published posts (e.g. `images/blog/my-diagram.png`) after you add the file to the repo, and keep base64 for short drafts only.
