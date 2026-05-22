let _pending = false
export const signalEventRefresh = () => { _pending = true }
export const consumeEventRefresh = () => { const v = _pending; _pending = false; return v }
