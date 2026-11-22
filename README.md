# Lynn & Fadi · 27.03.2027

RSVP site for the wedding at the Bliesgau Scheune. Plain static site (GitHub Pages) + a Google Sheet that collects the answers.

## 1. Put the site online (GitHub Pages)

1. Merge this branch into `main`.
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. After about a minute the site is at `https://fadi1089.github.io/marriage/`.

Language is picked from the visitor's country (DE/AT → German, FR/BE/LU → French, else browser language, else English).
You can force one in a link: `…/marriage/?lang=de`.

## 2. Connect the form to a Google Sheet (about 5 min)

1. Create a new Google Sheet (e.g. "Wedding RSVP").
2. **Extensions → Apps Script**. Delete what's there, paste the content of [`apps-script/Code.gs`](apps-script/Code.gs), save.
   - Optional: put your email in `NOTIFY_EMAIL` to get a mail for every reply.
3. In the function dropdown choose **setup** → **Run** → allow the permissions. The tabs RSVP, Summary, Kitchen, Music appear.
4. **Deploy → New deployment → type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   → **Deploy**, copy the URL ending in `/exec`.
5. Paste that URL into `assets/js/config.js` → `scriptUrl: "…"`, commit, push.

If you change `Code.gs` later: **Deploy → Manage deployments → ✏️ → Version: New version** (the URL stays the same).

What you get in the Sheet:
- **Summary**: total people coming (the number for the venue), children, households yes/no, allergy and diet counts.
- **RSVP**: one row per household. If someone resends with the same email, their row is updated, not duplicated.
- **Kitchen**: only the people with allergies/diets/notes, ready to forward to the caterer.
- **Music**: every song suggestion.

## 3. Cagnotte

Create the pot, then paste its link into `assets/js/config.js` → `cagnotteUrl`. Until then the site says "link coming soon".

Options: OnParticipe (free, optional tip for the platform), Lydia/Sumeria or Leetchi, or just a bank transfer: fill `iban` in `config.js` and an IBAN block with a copy button appears.

## Files

- `index.html`: the page
- `assets/js/i18n.js`: all texts in FR / DE / EN
- `assets/js/config.js`: links you may change (form URL, cagnotte, hotels)
- `assets/css/style.css`: look (colours taken from the printed invitation)
- `apps-script/Code.gs`: the Google Sheet backend
