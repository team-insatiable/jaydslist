#!/usr/bin/env bash
# Dev seed — wipes local D1 and re-seeds with fresh data
set -e

echo "Wiping local D1..."
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject

echo "Applying migrations..."
npx wrangler d1 migrations apply jaydslist-d1 --local

echo "Generating seed SQL..."
npx tsx scripts/seed.ts > /tmp/jdl_seed_full.sql

grep "^INSERT OR IGNORE INTO user "                    /tmp/jdl_seed_full.sql > /tmp/jdl_seed_users.sql
grep "^INSERT OR IGNORE INTO account "                 /tmp/jdl_seed_full.sql > /tmp/jdl_seed_accounts.sql
grep "^INSERT OR IGNORE INTO user_profiles "           /tmp/jdl_seed_full.sql > /tmp/jdl_seed_profiles.sql
grep "^INSERT OR IGNORE INTO listings "                /tmp/jdl_seed_full.sql > /tmp/jdl_seed_listings.sql
grep "^INSERT OR IGNORE INTO conversation_threads "    /tmp/jdl_seed_full.sql > /tmp/jdl_seed_threads.sql
grep "^INSERT OR IGNORE INTO messages "                /tmp/jdl_seed_full.sql > /tmp/jdl_seed_messages.sql

echo "Inserting users..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_users.sql

echo "Inserting accounts..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_accounts.sql

echo "Inserting profiles..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_profiles.sql

echo "Inserting listings..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_listings.sql

echo "Inserting threads..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_threads.sql

echo "Inserting messages..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_messages.sql

echo "Done. Login with alice@example.com or bob@example.com / Password01"
