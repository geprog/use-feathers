import { computed, reactive, Ref } from 'vue';

export type Store<T, ID = string> = {
  getRecord(id: Ref<ID>): Ref<T | undefined>;
  setRecord(id: ID, record: T): void;
  removeRecord(id: ID): void;
  getRecords(): Ref<T[]>;
  getFilteredRecords(filter: (record: T) => boolean): Ref<T[]>;
};

export class BasicStore<T, ID = string> {
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

  getFilteredRecords(filter: (record: T) => boolean): Ref<T[]> {
    return computed(() => Array.from(this.records.values()).filter(filter));
  }
}
