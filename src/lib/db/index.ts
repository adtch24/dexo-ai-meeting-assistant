import { Meeting, ActionItem, ActionItemStatus } from "@/lib/types";

export const DB_NAME = "dexo_db";
export const DB_VERSION = 1;

export const STORES = {
  MEETINGS: "meetings",
  AUDIO_BLOBS: "audio_blobs",
  ACTION_ITEMS: "action_items",
  APP_META: "app_meta",
} as const;

export interface StoredAudioBlob {
  meetingId: string;
  blob: Blob;
  mimeType?: string;
  fileName?: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface AppMetaRecord {
  key: string;
  value: any;
  updatedAt: string;
}

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined"
  );
}

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or returns an existing connection to the Dexo IndexedDB database.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Meetings Store
      if (!db.objectStoreNames.contains(STORES.MEETINGS)) {
        const meetingStore = db.createObjectStore(STORES.MEETINGS, { keyPath: "id" });
        meetingStore.createIndex("source", "source", { unique: false });
        meetingStore.createIndex("status", "status", { unique: false });
        meetingStore.createIndex("scheduledAt", "scheduledAt", { unique: false });
        meetingStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 2. Audio Blobs Store (Holds actual binary Blobs isolated from meeting metadata)
      if (!db.objectStoreNames.contains(STORES.AUDIO_BLOBS)) {
        const audioStore = db.createObjectStore(STORES.AUDIO_BLOBS, { keyPath: "meetingId" });
        audioStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 3. Action Items Store
      if (!db.objectStoreNames.contains(STORES.ACTION_ITEMS)) {
        const actionStore = db.createObjectStore(STORES.ACTION_ITEMS, { keyPath: "id" });
        actionStore.createIndex("meetingId", "meetingId", { unique: false });
        actionStore.createIndex("status", "status", { unique: false });
        actionStore.createIndex("priority", "priority", { unique: false });
        actionStore.createIndex("dueDate", "dueDate", { unique: false });
        actionStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 4. App Metadata Store (Tracks seed flags, migrations, schema state)
      if (!db.objectStoreNames.contains(STORES.APP_META)) {
        db.createObjectStore(STORES.APP_META, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("Dexo IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Sanitizes meeting object for persistent storage.
 * Strips out ephemeral `blob:` URLs (which expire when tabs close), while keeping
 * persistent remote URLs and preserving all metadata.
 */
function sanitizeMeetingForStorage(meeting: Meeting): Meeting {
  const sanitized = { ...meeting };
  // If recordingUrl is an ephemeral in-memory Blob URL, do not persist it as a dead string.
  // Instead, the actual Blob is stored in the audio_blobs store.
  if (sanitized.recordingUrl && sanitized.recordingUrl.startsWith("blob:")) {
    delete sanitized.recordingUrl;
  }
  // AudioBlob is stored separately in audio_blobs to keep meeting metadata light
  delete sanitized.audioBlob;
  return sanitized;
}

/**
 * Seed initial dataset if this is the first application launch in the browser.
 * Safe and idempotent: will not create duplicates or overwrite existing data.
 */
export async function initAndSeedData(
  initialMeetings: Meeting[],
  initialActionItems: ActionItem[]
): Promise<{ meetings: Meeting[]; actionItems: ActionItem[] }> {
  if (!isIndexedDBAvailable()) {
    return { meetings: initialMeetings, actionItems: initialActionItems };
  }

  const db = await openDatabase();

  // Check if database was already initialized and seeded
  const meta = await getAppMeta("is_seeded");

  if (!meta || !meta.value) {
    // Perform initial seed in a single transaction
    const tx = db.transaction(
      [STORES.MEETINGS, STORES.ACTION_ITEMS, STORES.APP_META],
      "readwrite"
    );

    const meetingStore = tx.objectStore(STORES.MEETINGS);
    for (const m of initialMeetings) {
      meetingStore.put(sanitizeMeetingForStorage(m));
    }

    const actionStore = tx.objectStore(STORES.ACTION_ITEMS);
    for (const act of initialActionItems) {
      actionStore.put(act);
    }

    const metaStore = tx.objectStore(STORES.APP_META);
    metaStore.put({
      key: "is_seeded",
      value: true,
      updatedAt: new Date().toISOString(),
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return { meetings: initialMeetings, actionItems: initialActionItems };
  }

  // Database is already seeded — load live persisted user data
  const persistedMeetings = await getAllMeetings();
  const persistedActionItems = await getAllActionItems();

  // Fallback: If stores are somehow empty, reseed safely
  if (persistedMeetings.length === 0) {
    return initAndSeedData(initialMeetings, initialActionItems);
  }

  return {
    meetings: persistedMeetings,
    actionItems: persistedActionItems,
  };
}

/**
 * Get all meetings with their associated audio Blobs attached.
 */
export async function getAllMeetings(): Promise<Meeting[]> {
  const db = await openDatabase();

  const rawMeetings = await new Promise<Meeting[]>((resolve, reject) => {
    const tx = db.transaction([STORES.MEETINGS], "readonly");
    const store = tx.objectStore(STORES.MEETINGS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // Fetch all audio blobs to attach to meetings
  const audioMap = await getAllAudioBlobsMap();

  const hydratedMeetings = rawMeetings.map((m) => {
    const storedAudio = audioMap.get(m.id);
    if (storedAudio && storedAudio.blob) {
      // Generate a fresh live blob URL for this session
      const objectUrl = typeof window !== "undefined" ? URL.createObjectURL(storedAudio.blob) : undefined;
      return {
        ...m,
        audioBlob: storedAudio.blob,
        recordingUrl: objectUrl || m.recordingUrl,
        recordingFileSizeMb: m.recordingFileSizeMb || +(storedAudio.sizeBytes / (1024 * 1024)).toFixed(2),
      };
    }
    return m;
  });

  // Sort descending by scheduledAt / createdAt
  return hydratedMeetings.sort(
    (a, b) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime()
  );
}

/**
 * Get a specific meeting by ID with its audio Blob attached.
 */
export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const db = await openDatabase();

  const meeting = await new Promise<Meeting | undefined>((resolve, reject) => {
    const tx = db.transaction([STORES.MEETINGS], "readonly");
    const store = tx.objectStore(STORES.MEETINGS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!meeting) return undefined;

  const audio = await getAudioBlob(id);
  if (audio) {
    meeting.audioBlob = audio;
    if (typeof window !== "undefined") {
      meeting.recordingUrl = URL.createObjectURL(audio);
    }
  }

  return meeting;
}

/**
 * Save or update a meeting record.
 * If audioBlob is supplied, persists the raw binary Blob in the dedicated audio store.
 */
export async function saveMeeting(meeting: Meeting, audioBlob?: Blob): Promise<void> {
  const db = await openDatabase();

  const blobToSave = audioBlob || meeting.audioBlob;

  const tx = db.transaction(
    blobToSave
      ? [STORES.MEETINGS, STORES.AUDIO_BLOBS, STORES.ACTION_ITEMS]
      : [STORES.MEETINGS, STORES.ACTION_ITEMS],
    "readwrite"
  );

  const meetingStore = tx.objectStore(STORES.MEETINGS);
  meetingStore.put(sanitizeMeetingForStorage(meeting));

  if (blobToSave) {
    const audioStore = tx.objectStore(STORES.AUDIO_BLOBS);
    const audioRecord: StoredAudioBlob = {
      meetingId: meeting.id,
      blob: blobToSave,
      mimeType: blobToSave.type || "audio/webm",
      sizeBytes: blobToSave.size,
      updatedAt: new Date().toISOString(),
    };
    audioStore.put(audioRecord);
  }

  // Also sync any MoM action items into the global action items store
  if (meeting.mom?.actionItems) {
    const actionStore = tx.objectStore(STORES.ACTION_ITEMS);
    // Clear previous items for this meeting to prevent duplicates on regeneration
    const meetingIdIndex = actionStore.index("meetingId");
    const getKeysReq = meetingIdIndex.getAllKeys(meeting.id);
    getKeysReq.onsuccess = () => {
      const keys = getKeysReq.result || [];
      for (const key of keys) {
        actionStore.delete(key);
      }
      for (const act of meeting.mom?.actionItems || []) {
        actionStore.put({
          ...act,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
        });
      }
    };
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      console.error("Dexo saveMeeting transaction error:", tx.error);
      reject(tx.error);
    };
    tx.onabort = () => {
      console.error("Dexo saveMeeting transaction aborted:", tx.error);
      reject(tx.error);
    };
  });
}

/**
 * Delete a meeting and its associated audio blob and action items.
 */
export async function deleteMeeting(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(
    [STORES.MEETINGS, STORES.AUDIO_BLOBS, STORES.ACTION_ITEMS],
    "readwrite"
  );

  tx.objectStore(STORES.MEETINGS).delete(id);
  tx.objectStore(STORES.AUDIO_BLOBS).delete(id);

  // Delete related action items
  const actionStore = tx.objectStore(STORES.ACTION_ITEMS);
  const index = actionStore.index("meetingId");
  const request = index.getAllKeys(id);

  request.onsuccess = () => {
    const keys = request.result;
    for (const key of keys) {
      actionStore.delete(key);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save an audio Blob for a meeting.
 */
export async function saveAudioBlob(
  meetingId: string,
  blob: Blob,
  mimeType?: string,
  fileName?: string
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.AUDIO_BLOBS], "readwrite");
  const store = tx.objectStore(STORES.AUDIO_BLOBS);

  const record: StoredAudioBlob = {
    meetingId,
    blob,
    mimeType: mimeType || blob.type || "audio/webm",
    fileName,
    sizeBytes: blob.size,
    updatedAt: new Date().toISOString(),
  };

  store.put(record);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve the audio Blob for a meeting.
 */
export async function getAudioBlob(meetingId: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.AUDIO_BLOBS], "readonly");
    const store = tx.objectStore(STORES.AUDIO_BLOBS);
    const request = store.get(meetingId);

    request.onsuccess = () => {
      const record = request.result as StoredAudioBlob | undefined;
      resolve(record ? record.blob : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all audio blobs as a Map of meetingId -> StoredAudioBlob.
 */
async function getAllAudioBlobsMap(): Promise<Map<string, StoredAudioBlob>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.AUDIO_BLOBS], "readonly");
    const store = tx.objectStore(STORES.AUDIO_BLOBS);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result || []) as StoredAudioBlob[];
      const map = new Map<string, StoredAudioBlob>();
      for (const rec of records) {
        map.set(rec.meetingId, rec);
      }
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an audio Blob for a meeting.
 */
export async function deleteAudioBlob(meetingId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.AUDIO_BLOBS], "readwrite");
  tx.objectStore(STORES.AUDIO_BLOBS).delete(meetingId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve all action items from IndexedDB.
 */
export async function getAllActionItems(): Promise<ActionItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.ACTION_ITEMS], "readonly");
    const store = tx.objectStore(STORES.ACTION_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result || []) as ActionItem[];
      // Sort items by priority / dueDate / createdAt
      resolve(
        items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update an action item.
 */
export async function saveActionItem(item: ActionItem): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.ACTION_ITEMS], "readwrite");
  tx.objectStore(STORES.ACTION_ITEMS).put(item);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Update status of an action item.
 */
export async function updateActionItemStatus(
  id: string,
  status: ActionItemStatus,
  completedAt?: string
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.ACTION_ITEMS], "readwrite");
  const store = tx.objectStore(STORES.ACTION_ITEMS);

  const getRequest = store.get(id);

  getRequest.onsuccess = () => {
    const item = getRequest.result as ActionItem | undefined;
    if (item) {
      item.status = status;
      item.completedAt = completedAt;
      store.put(item);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete an action item.
 */
export async function deleteActionItem(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.ACTION_ITEMS], "readwrite");
  tx.objectStore(STORES.ACTION_ITEMS).delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve metadata entry by key.
 */
export async function getAppMeta(key: string): Promise<AppMetaRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.APP_META], "readonly");
    const store = tx.objectStore(STORES.APP_META);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set metadata entry.
 */
export async function setAppMeta(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.APP_META], "readwrite");
  tx.objectStore(STORES.APP_META).put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

