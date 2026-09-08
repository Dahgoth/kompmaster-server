import 'dotenv/config';import {initSchema,pool} from '../src/db.js';await initSchema();console.log('DB ready');await pool.end();
