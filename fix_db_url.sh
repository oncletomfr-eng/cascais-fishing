#!/bin/bash
# Создаем временный файл с правильным DATABASE_URL
cat .env.local | sed '/^DATABASE_URL=/,/^res"$/c\
DATABASE_URL="postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"' > .env.local.temp
mv .env.local.temp .env.local
