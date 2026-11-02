import { compressJSONText } from './codec-core.js';
self.onmessage = async ({ data }) => { try { const result = await compressJSONText(data); self.postMessage(result, [result.buffer]); } catch (error) { self.postMessage({ error: error.message }); } };
