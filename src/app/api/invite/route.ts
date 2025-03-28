import { createServerTuskyClient } from '@/lib/tusky/client';

const apiKey = process.env.TUSKY_API_KEY;

const tuskyServer = await createServerTuskyClient(apiKey);

