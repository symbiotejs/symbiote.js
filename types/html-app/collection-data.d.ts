export function validateJSON(value: unknown, ancestors?: Set<object>): void;
export function recordData(value: unknown): RecordData;
export function collectionData(value: unknown): RecordData[];
export function cloneData<T>(value: T): T;
export function matches(item: RecordData, match: RecordData): boolean;
export function matchData(value: unknown): Record<string, any>;
export function appendRecord(source: unknown, draft: unknown): Record<string, any>[];
export function prependRecord(source: unknown, draft: unknown): Record<string, any>[];
export function updateRecord(source: unknown, id: string, patch: RecordData | null): Record<string, any>[];
export function updateMatching(source: unknown, match: unknown, patch?: unknown): Record<string, any>[];
export function projectCollection(source: unknown, filter?: unknown, search?: unknown, fields?: string[], sort?: unknown): Record<string, any>[];
export type RecordData = Record<string, any>;
//# sourceMappingURL=collection-data.d.ts.map