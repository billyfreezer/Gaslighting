const DATABASE_NAME = "actually-local-evidence";
const DATABASE_VERSION = 1;
const STORE_NAME = "audio-chunks";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = action(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

export async function clearEvidence(): Promise<void> {
  await transact("readwrite", (store) => store.clear());
  localStorage.removeItem("actually-recording-mime");
  localStorage.removeItem("actually-recording-started");
}

export async function saveEvidenceChunk(blob: Blob): Promise<void> {
  await transact("readwrite", (store) =>
    store.add({ blob, createdAt: Date.now() }),
  );
}

export async function readEvidenceChunks(): Promise<Blob[]> {
  const rows = await transact<Array<{ blob: Blob }>>("readonly", (store) =>
    store.getAll(),
  );
  return rows.map((row) => row.blob);
}

export async function evidenceChunkCount(): Promise<number> {
  return transact("readonly", (store) => store.count());
}

