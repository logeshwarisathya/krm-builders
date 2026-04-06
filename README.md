# KRM Planner and Builders & Services
## Full-Stack Website — Setup & Deployment Guide

---

## 📁 Project Structure

```
krm/
├── server.js              ← Express server (entry point)
├── package.json
├── .env.example           ← Copy to .env and configure
├── db/
│   └── database.js        ← NeDB database layer
├── routes/
│   └── api.js             ← All API endpoints
├── middleware/
│   └── auth.js            ← Auth helpers
├── public/
│   └── index.html         ← Main website (SEO-optimised)
├── admin/
│   ├── login.html         ← Admin login page
│   └── dashboard.html     ← Admin panel
└── README.md
```

---

## 🚀 Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Start the server
node server.js

# Open browser:
#   Website  → http://localhost:3000
#   Admin    → http://localhost:3000/admin
```

**Default admin credentials:**
- Username: `admin`
- Password: `admin@krm2024`
> ⚠️ Change the password immediately after first login via Settings → Change Password

---

## 🔐 Admin Panel Features

| Feature | Description |
|---|---|
| Dashboard | Live stats: total, new, contacted, closed leads |
| Bar Chart | Last 7 days of daily enquiry volume |
| Service Breakdown | Which services get the most enquiries |
| Enquiries Table | Full searchable, filterable lead list |
| Lead Detail | View full details, add internal notes |
| Status Update | Mark as New / Contacted / Closed |
| CSV Export | Download all leads as spreadsheet |
| Change Password | Secure password management |

---

## 🗄️ Database

Uses **NeDB** — a zero-config embedded database (no MySQL/Postgres needed).

Data files are created automatically:
- `db/leads.db` — all customer enquiries
- `db/admins.db` — admin users

**Back up these files regularly!** Copy them to a safe location.

---

## 🌐 API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/leads` | Submit a new enquiry from the website |
| `GET` | `/sitemap.xml` | XML sitemap for Google |
| `GET` | `/robots.txt` | Robots crawl rules |

### Admin (requires login)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Admin login |
| `POST` | `/api/admin/logout` | Admin logout |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/leads` | List leads (filter/search/paginate) |
| `GET` | `/api/admin/leads/:id` | Get single lead |
| `PATCH` | `/api/admin/leads/:id` | Update status/notes/priority |
| `DELETE` | `/api/admin/leads/:id` | Delete a lead |
| `GET` | `/api/admin/export/csv` | Download leads as CSV |
| `POST` | `/api/admin/change-password` | Change admin password |

---

## 🔍 SEO Features Built-In

### Technical SEO
- ✅ Semantic HTML5 with proper heading hierarchy (H1 → H2 → H3)
- ✅ Meta title with primary keywords
- ✅ Meta description (compelling, under 160 chars)
- ✅ Meta keywords tag
- ✅ Canonical URL tag
- ✅ `robots` meta tag (`index, follow, max-snippet:-1`)
- ✅ Open Graph tags (Facebook/WhatsApp preview)
- ✅ Twitter Card tags
- ✅ `geo.region` and `geo.placename` for local SEO
- ✅ Dynamic `sitemap.xml` (auto-generates with correct domain)
- ✅ `robots.txt` (blocks admin pages from indexing)
- ✅ Gzip compression (server-level)
- ✅ Static file caching headers (7-day)
- ✅ Mobile-responsive (Google mobile-first indexing)
- ✅ Fast load time (no heavy JS frameworks)

### Schema.org Structured Data (JSON-LD)
- `LocalBusiness` schema with full business details
- `hasOfferCatalog` listing all services
- `openingHoursSpecification`
- `aggregateRating` for rich star snippets in Google results
- `areaServed` targeting Tamil Nadu

### What to Do Next for Google Ranking

1. **Register on Google Search Console**
   - Go to https://search.google.com/search-console
   - Add your domain, verify ownership (add a meta tag to index.html)
   - Submit your sitemap: `https://yourdomain.com/sitemap.xml`

2. **Google Business Profile**
   - Register at https://business.google.com
   - Add your business in Tamil Nadu with exact address
   - This gets you into Google Maps and local search results
   - Add photos, hours, services, and your website URL

3. **Update Canonical URLs**
   - In `public/index.html`, replace all `https://krmbuilders.com` with your actual domain

4. **Get Backlinks**
   - List your business on JustDial, Sulekha, IndiaMart, Tradeindia
   - Get listed on local Tamil Nadu business directories
   - Ask satisfied clients to leave Google reviews

5. **Page Speed (Core Web Vitals)**
   - Serve the site over HTTPS (use Nginx + Let's Encrypt)
   - Consider adding images (replace emoji placeholders with real project photos)
   - Target score of 90+ on https://pagespeed.web.dev

6. **Content (Blog)**
   - Add a `/blog` section with articles like:
     - "How to get DTCP approval in Tamil Nadu (2024 guide)"
     - "DTCP vs CMDA vs RERA – What's the difference?"
     - "2D vs 3D layout design – which do you need?"
   - These rank for informational keywords and bring organic traffic

---

## 🖥️ Production Deployment (Ubuntu VPS / Render / Railway)

### Option A: VPS with Nginx (Recommended)

```bash
# 1. Upload files to server
scp -r ./krm user@your-server:/var/www/krm

# 2. Install Node.js on server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install dependencies
cd /var/www/krm && npm install --production

# 4. Install PM2 (process manager)
npm install -g pm2

# 5. Start with PM2
pm2 start server.js --name krm-builders
pm2 startup  # auto-start on reboot
pm2 save

# 6. Nginx config (/etc/nginx/sites-available/krmbuilders.com)
server {
    server_name krmbuilders.com www.krmbuilders.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# 7. SSL with Let's Encrypt
sudo certbot --nginx -d krmbuilders.com -d www.krmbuilders.com
```

### Option B: Railway / Render (Free hosting)

1. Push code to GitHub
2. Create new project on https://railway.app or https://render.com
3. Connect your GitHub repo
4. Set environment variable: `SESSION_SECRET=your-long-secret`
5. Deploy — get a free `.railway.app` or `.onrender.com` URL

---

## 🔧 Customisation Checklist

- [ ] Update phone number (`+91 98765 43210`) across `index.html`
- [ ] Update email (`info@krmbuilders.com`) across `index.html` and `server.js`
- [ ] Update WhatsApp number in the `wa.me` links
- [ ] Update company address/location
- [ ] Replace `https://krmbuilders.com` canonical URLs with actual domain
- [ ] Change admin password after first login
- [ ] Change `SESSION_SECRET` in `.env`
- [ ] Add real project photos to gallery section
- [ ] Register on Google Search Console + submit sitemap

---

## 📞 Support

Built for KRM Planner and Builders & Services, Tamil Nadu.
Tech stack: Node.js · Express · NeDB · Vanilla HTML/CSS/JS
