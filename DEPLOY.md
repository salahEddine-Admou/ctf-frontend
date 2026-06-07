# Déployer le frontend (React seul)

Repo GitHub : **https://github.com/devopacademyv1-a11y/ctf-front.git**

L’API tourne sur un **autre** hébergeur (Render, Railway, etc.). Voir [backend/DEPLOY.md](../backend/DEPLOY.md).

## 1. Pousser le code frontend

Depuis le dossier `frontend/` :

```bash
cd frontend
git init
git add .
git commit -m "NFC CRM frontend"
git branch -M main
git remote add origin https://github.com/devopacademyv1-a11y/ctf-front.git
git push -u origin main
```

## 2. Variables d’environnement

Créez `.env.production` ou configurez sur la plateforme :

```env
VITE_API_URL=https://VOTRE-API.onrender.com/api
```

Remplacez par l’URL réelle de votre API (avec `/api` à la fin).

Sur le **backend**, mettez à jour `CLIENT_URL` avec l’URL du frontend (ex. `https://ctf-front.vercel.app`).

## 3. Déploiement (exemples)

### Vercel (frontend statique uniquement)

1. Import repo `ctf-front`
2. **Root Directory** : `./` (racine du repo)
3. **Framework** : Vite
4. **Build** : `npm run build`
5. **Output** : `dist`
6. Variable : `VITE_API_URL` = URL API + `/api`

### Netlify

- Build command : `npm run build`
- Publish directory : `dist`
- Env : `VITE_API_URL`

### Cloudflare Pages

- Même principe : build Vite, `dist`, `VITE_API_URL`

## 4. Vérifier

1. Ouvrir l’URL du frontend
2. Login : `admin@nfc-crm.ma` / `admin123`
3. DevTools → Network : les requêtes doivent aller vers `VOTRE-API.../api/...`, pas vers le domaine du frontend seul

## Dev local

```bash
cp .env.example .env
# Laisser VITE_API_URL vide — proxy Vite vers localhost:5000
npm run dev
```
