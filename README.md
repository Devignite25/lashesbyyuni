# Lashes by Yuni — site

Plain HTML/CSS/JS. No build step. All content lives in `data/*.json` so prices, services, gallery items, hours, and social links can change without touching code.

## File map

```
index.html        page skeleton + tabs
styles.css        all styling
app.js            tab routing, JSON loaders, Formspree wiring
logo.png          site logo (replace with your own — same name)
assets/           gallery images (drop new ones here)
data/site.json      name, hero, contact, hours, social, formspree id
data/about.json     about-page heading, bio paragraphs, photo
data/services.json  service categories + items + prices
data/gallery.json   gallery / future shop items
```

## How to update content

Open the JSON file in a text editor (or directly on GitHub via the pencil icon), make the change, save/commit. Site updates within ~1 minute on GitHub Pages.

### Change a price or add a service
Edit `data/services.json`. Each service is:
```json
{ "name": "Classic Full Set", "price": 120, "duration": "2 hr", "description": "..." }
```
Add/remove entries inside the right `items: []` array.

### Add a gallery photo
1. Drop the image in `assets/` (e.g. `assets/image5.png`).
2. Add an entry to `data/gallery.json`:
```json
{
  "id": "set-005",
  "image": "assets/image5.png",
  "title": "New Volume Set",
  "description": "Wispy, fluffy fans.",
  "tags": ["volume"],
  "forSale": false
}
```

### List a product for sale (later)
Set `forSale: true` and add `price` + `currency`:
```json
{
  "id": "lash-glue-pro",
  "image": "assets/lash-glue.png",
  "title": "Pro Lash Adhesive",
  "description": "Sensitive-friendly adhesive.",
  "tags": ["product"],
  "forSale": true,
  "price": 25,
  "currency": "USD",
  "buyAction": "inquiry"
}
```
Today's "Inquire" button routes the customer to the booking form with the product pre-filled. When real checkout is added later, only `app.js` changes — the data shape stays the same.

### Update the About bio or photo
Edit `data/about.json`. The `body` is an array — each string becomes its own paragraph:
```json
{
  "heading": "Hi, I'm Yuni",
  "body": [
    "First paragraph of the bio.",
    "Second paragraph if you want one."
  ],
  "image": "assets/image2.png",
  "imageAlt": "Description for screen readers"
}
```
To swap the photo, drop the new image in `assets/` and update `image` to point at it.

### Update hours, address, phone, social
Edit `data/site.json`.

### Change Formspree form
Edit `data/site.json` → `formspree.formId`. Current value: `mrerdlak`.

## Local preview

```bash
cd lashebyyuni
python3 -m http.server 8000
# open http://localhost:8000
```

(`fetch()` won't work via `file://`, so a local server is required for previewing.)

## Deploy on GitHub Pages

1. Create a GitHub repo and push these files to `main`.
2. Repo → Settings → Pages → Source: `Deploy from a branch`, Branch: `main`, Folder: `/ (root)`.
3. Visit the URL Pages gives you. Future commits to `main` redeploy automatically.
