// Реальные платёжные системы добавляются сюда отдельными адаптерами.
// Секреты берутся только из переменных окружения/серверного хранилища и никогда не уходят в браузер.
const adapters = new Map();
export function registerPaymentAdapter(code, adapter){adapters.set(code,adapter);}
export function getPaymentAdapter(code){return adapters.get(code)||null;}
export function listPaymentAdapters(){return [...adapters.keys()];}
