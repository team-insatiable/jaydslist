#!/usr/bin/env bash
# Dev seed — generates and applies local D1 seed data
set -e

echo "Generating seed SQL..."
npx tsx scripts/seed.ts > /tmp/jdl_seed_full.sql

grep "^INSERT OR IGNORE INTO user "          /tmp/jdl_seed_full.sql > /tmp/jdl_seed_users.sql
grep "^INSERT OR IGNORE INTO account "       /tmp/jdl_seed_full.sql > /tmp/jdl_seed_accounts.sql
grep "^INSERT OR IGNORE INTO user_profiles " /tmp/jdl_seed_full.sql > /tmp/jdl_seed_profiles.sql
grep "^INSERT OR IGNORE INTO listings "      /tmp/jdl_seed_full.sql > /tmp/jdl_seed_listings.sql

echo "Inserting users..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_users.sql

echo "Inserting accounts..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_accounts.sql

echo "Inserting profiles..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_profiles.sql

echo "Inserting listings..."
npx wrangler d1 execute jaydslist-d1 --local --file /tmp/jdl_seed_listings.sql

echo "Done. Login with keirockjd@gmail.com or keirajd@gmail.com / Password01"
