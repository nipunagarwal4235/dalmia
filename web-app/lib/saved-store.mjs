// Each account has its own cache and queue. The iOS and Android apps port this logic.
export function createSavedStore({client, storage, guestKey, onChange}) {
  let state = {saved: new Set(), ready: false, error: '', signedIn: false};
  let user = null, generation = 0, disposed = false, pending = {}, running = false;
  let writes = Promise.resolve();
  const publish = changes => {state = {...state, ...changes}; if (!disposed) onChange(state);};
  const key = () => user ? `dalmia-saved-account-${user}` : guestKey;
  const persist = () => {
    const target = key();
    const value = JSON.stringify(user ? {ids: [...state.saved], pending} : [...state.saved]);
    writes = writes.catch(() => {}).then(() => storage.setItem(target, value));
    return writes;
  };
  async function changeUser(nextUser) {
    if (state.ready && user === nextUser) return;
    const token = ++generation;
    user = nextUser; pending = {}; running = false;
    publish({saved: new Set(), ready: false, error: '', signedIn: !!user});
    try {
      await writes.catch(() => {});
      const raw = JSON.parse(await storage.getItem(key()) || (user ? '{}' : '[]'));
      if (token !== generation || disposed) return;
      pending = user && raw.pending && typeof raw.pending === 'object' ? raw.pending : {};
      publish({saved: new Set((Array.isArray(raw) ? raw : raw.ids || []).filter(id => typeof id === 'string')), ready: true});
    } catch {if (token === generation) publish({ready: true, error: 'Saved products cannot be stored on this device.'});}
    if (token === generation) void sync();
  }
  async function sync() {
    if (!user || !state.ready || running || disposed) return;
    const token = generation, owner = user;
    running = true;
    try {
      const {data: sessionData, error: sessionError} = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (token !== generation || sessionData.session?.user.id !== owner) return;
      for (const [id, value] of Object.entries({...pending})) {
        if (token !== generation || disposed) return;
        const {error} = await client.rpc('set_saved_product', {product: id, saved: value});
        if (error && error.code !== '23503') throw error;
        if (token !== generation) return;
        if (pending[id] === value) delete pending[id];
        await persist();
      }
      const {data, error} = await client.rpc('get_saved_products');
      if (error) throw error;
      if (token !== generation || disposed) return;
      const ids = new Set(data);
      for (const [id, selected] of Object.entries(pending)) {if (selected) ids.add(id); else ids.delete(id);}
      publish({saved: ids, error: ''});
      await persist();
    } catch {if (token === generation) publish({error: 'Saved changes are on this device. Sync will retry when your connection and account access are available.'});}
    finally {if (token === generation) running = false;}
  }
  async function set(id, selected) {
    if (!state.ready || disposed) return;
    const ids = new Set(state.saved);
    if (selected) ids.add(id); else ids.delete(id);
    if (user) pending[id] = selected;
    publish({saved: ids});
    try {await persist(); void sync();}
    catch {publish({error: 'Your latest saved changes could not be stored. Keep the app open and try again.'});}
  }
  async function importGuest() {
    if (!user || !state.ready) return;
    const token = generation;
    try {
      const ids = JSON.parse(await storage.getItem(guestKey) || '[]');
      if (token !== generation || !Array.isArray(ids)) return;
      for (const id of ids) if (typeof id === 'string') await set(id, true);
    } catch {publish({error: 'The device collection is unavailable.'});}
  }
  return {changeUser, sync, set, importGuest, getState: () => state, dispose: () => {disposed = true; generation++;}};
}
