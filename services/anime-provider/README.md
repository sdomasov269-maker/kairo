# Kairo anime provider

Small server-only adapter around `anime_parsers_ru`. Python >= 3.12 is required
for the currently bundled `anime_parsers_ru 1.17.0` source.

## Local setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8787
```

From the repository root, the recommended development command starts Next.js
and this provider together:

```powershell
cd D:\ANIME
npm run dev:all
```

The provider automatically loads repository `.env.local` before `.env`, while
preserving values already supplied by the process/OS environment. For local
diagnostics only, `KODIK_AUTOMATIC_TOKEN_FALLBACK=true` permits the library's
one-time automatic lookup when no configured token exists. Never expose this
service directly to browsers; Next.js is its boundary.
