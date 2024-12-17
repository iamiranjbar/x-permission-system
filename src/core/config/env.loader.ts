import * as dotenv from 'dotenv';
import { join } from 'path';

const envFilePath = join(
  process.cwd(),
  'config',
  `.env.${process.env.NODE_ENV || 'development'}`,
);
dotenv.config({ path: envFilePath });

console.log(`Loaded environment from: ${envFilePath}`);
