import { defineStore } from 'pinia';
import { computed, reactive, Ref } from 'vue';

export interface Store<T, ID = string | number> {
  getRecord(id: Ref<ID | null | undefined>): Ref<T | undefined>;
  setRecord(id: ID, record: T): void;
  removeRecord(id: ID): void;
  getRecords(): Ref<T[]>;
  getFilteredRecords(filter: Ref<(record: T) => boolean>): Ref<T[]>;
}

export class BasicStore<T, ID = string | number> implements Store<T, ID> {
  records = reactive<Map<ID, T>>(new Map());

  setRecord(id: ID, record: T): void {
    this.records.set(id, record);
  }

  removeRecord(id: ID): void {
    this.records.delete(id);
  }

  getRecord(id: Ref<ID | null | undefined>): Ref<T | undefined> {
    return computed(() => (id.value ? this.records.get(id.value) : undefined));
  }

  getRecords(): Ref<T[]> {
    return computed(() => Array.from(this.records.values()));
  }

  getFilteredRecords(filter: Ref<(record: T) => boolean>): Ref<T[]> {
    return computed(() => Array.from(this.records.values()).filter(filter.value));
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const PiniaStore = <T, ID = string | number>(serviceName: string) => {
  const s = defineStore(serviceName, () => {
    const records = reactive<Map<ID, T>>(new Map());

    function setRecord(id: ID, record: T): void {
      records.set(id, record);
    }

    function removeRecord(id: ID): void {
      records.delete(id);
    }

    function getRecord(id: Ref<ID | null | undefined>): Ref<T | undefined> {
      return computed(() => (id.value ? records.get(id.value) : undefined));
    }

    function getRecords(): Ref<T[]> {
      return computed(() => Array.from(records.values()));
    }

    function getFilteredRecords(filter: Ref<(record: T) => boolean>): Ref<T[]> {
      return computed(() => Array.from(records.values()).filter(filter.value));
    }

    return { records, recordsList: getRecords(), setRecord, removeRecord, getRecord, getRecords, getFilteredRecords };
  });

  return s;
};
