# Environment variables

None. This app needs no `.env` file.

Supabase was removed (the project had zero tables and nothing imported the
client), and `VITE_BIBLE_API_KEY` was never referenced by any code — all
seventeen translations are bundled and served locally.

If you add something later that needs a key, remember: anything prefixed `VITE_`
is compiled into the public JavaScript bundle and visible to anyone who opens
devtools. Real secrets need a server endpoint, not an env var.
