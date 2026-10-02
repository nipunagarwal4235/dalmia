// SecureStore values stay below native size limits. Publish the index last.
export function secureSessionStorage(store) {
  const readIndex = async key => {
    const value = await store.getItemAsync(key);
    if (!value) return null;
    const index = JSON.parse(value);
    if (typeof index.version !== 'string' || !Number.isInteger(index.count) || index.count < 1 || index.count > 1000) throw new Error('Invalid saved session.');
    return index;
  };
  const removeChunks = async (key, index) => {
    if (index) await Promise.all(Array.from({length:index.count}, (_,i) => store.deleteItemAsync(`${key}.${index.version}.${i}`)));
  };
  return {
    async getItem(key) {
      const index = await readIndex(key);
      if (!index) return null;
      const chunks = await Promise.all(Array.from({length:index.count}, (_,i) => store.getItemAsync(`${key}.${index.version}.${i}`)));
      if (chunks.some(chunk=>chunk===null)) return null;
      return chunks.join('');
    },
    async setItem(key,value) {
      const old = await readIndex(key);
      const version = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const characters = Array.from(value);
      const chunks = [];
      for (let i=0;i<characters.length;i+=400) chunks.push(characters.slice(i,i+400).join(''));
      if (!chunks.length) chunks.push('');
      const index = {version,count:chunks.length};
      try {
        for (let i=0;i<chunks.length;i++) await store.setItemAsync(`${key}.${version}.${i}`, chunks[i]);
        await store.setItemAsync(key, JSON.stringify(index));
      } catch(error) {await removeChunks(key,index).catch(()=>{});throw error;}
      await removeChunks(key,old).catch(()=>{});
    },
    async removeItem(key) {
      const index = await readIndex(key);
      await store.deleteItemAsync(key);
      await removeChunks(key,index);
    },
  };
}
