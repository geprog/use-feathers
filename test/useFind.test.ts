import { FeathersError, GeneralError } from '@feathersjs/errors';
import type { Application, Paginated, Params } from '@feathersjs/feathers';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import useFindOriginal, { UseFind } from '~/useFind';
import { mountComposition } from '$/__helpers__/composition';
import { eventHelper } from '$/__helpers__/events';
import TestModel from '$/__helpers__/TestModel';

const testModel: TestModel = { _id: '111', mood: '😀', action: '🧘', category: 'enjoy' };
const additionalTestModel: TestModel = { _id: 'aaa', mood: '🤩', action: '🏄', category: 'sport' };
const additionalTestModel2: TestModel = { _id: 'bbb', mood: '', action: '', category: 'sport' };
const changedTestModel: TestModel = { ...testModel, mood: '😅', action: '🏋️', category: 'sport' };
const testModels: TestModel[] = [testModel, additionalTestModel2];

describe('Find composition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('should load data on mounted', async () => {
    expect.assertions(3);

    // given
    const serviceFind = vi.fn(() => testModels);

    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);

    // when
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.data.value).toStrictEqual(testModels);
  });

  it('should load data after connect', async () => {
    expect.assertions(3);

    // given
    const serviceFind = vi.fn(() => testModels);
    const emitter = eventHelper();
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: emitter.on,
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });
    serviceFind.mockClear(); // continue with fresh mock

    // when
    emitter.emit('connect');
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.data.value).toStrictEqual(testModels);
  });

  it('should indicate data loading', () => {
    expect.assertions(2);

    // given
    const feathersMock = {
      service: () => ({
        find: vi.fn(() => new Promise(() => null)),
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;

    // when
    mountComposition(() => {
      findComposition = useFind('testModels');
    });

    // then
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeTruthy();
  });

  it('should indicate data finished loading', async () => {
    expect.assertions(3);

    // given
    let serviceFindPromiseResolve: (value: TestModel[] | PromiseLike<TestModel[]>) => void = vi.fn();
    const serviceFind = vi.fn(
      () =>
        new Promise<TestModel[]>((resolve) => {
          serviceFindPromiseResolve = resolve;
        }),
    );
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });

    // before when
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeTruthy();

    // when
    serviceFindPromiseResolve(testModels);
    await flushPromises();

    // then
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
  });

  it('should indicate data finished loading even if an error occurred', async () => {
    expect.assertions(3);

    // given
    let serviceFindPromiseReject: (reason: FeathersError) => void = vi.fn();
    const serviceFind = vi.fn(
      () =>
        new Promise<TestModel[]>((resolve, reject) => {
          serviceFindPromiseReject = reject;
        }),
    );
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });

    // before when
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeTruthy();

    // when
    serviceFindPromiseReject(new GeneralError('test error'));
    await flushPromises();

    // then
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
  });

  it('should reload data after changing the params', async () => {
    expect.assertions(3);

    // given
    const findParams = ref({ query: { zug: 'start' } });
    const serviceFind = vi.fn((params: Params) => {
      if (params.query && params.query.zug === 'start') {
        return [additionalTestModel];
      }
      return [testModel];
    });
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels', findParams);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(findComposition && findComposition.data.value).toStrictEqual([additionalTestModel]);

    // when
    findParams.value = { query: { zug: 'change' } };
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(2);
    expect(serviceFind).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: { zug: 'change' },
      }),
    );
  });

  it('should un-load data after params changes to ref of undefined', async () => {
    expect.assertions(5);

    // given
    const findParams = ref<Params | undefined>({ query: { zug: 'start' } });
    const serviceFind = vi.fn(() => Promise.resolve([testModel]));
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels', findParams);
    });

    // before then to ensure that the previous loading procedure is completed
    await flushPromises();
    expect(findComposition && findComposition.data.value).toStrictEqual([testModel]);

    // when
    findParams.value = undefined;
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([]);
  });

  it('should un-load data after params changes to ref of null', async () => {
    expect.assertions(5);

    // given
    const findParams = ref<Params | null>({ query: { zug: 'start' } });
    const serviceFind = vi.fn(() => Promise.resolve([testModel]));
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels', findParams);
    });

    // before then to ensure that the previous loading procedure is completed
    await flushPromises();
    expect(findComposition && findComposition.data.value).toStrictEqual([testModel]);

    // when
    findParams.value = null;
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([]);
  });

  it('should return empty data when params is ref of undefined and load data after changing to valid params', async () => {
    expect.assertions(6);

    // given
    const findParams = ref<Params | undefined>();
    const serviceFind = vi.fn((params: Params) => {
      if (params.query && params.query.zug === 'start') {
        return [additionalTestModel];
      }
      return [testModel];
    });
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels', findParams);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([]);

    // when
    findParams.value = { query: { zug: 'start' } };
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([additionalTestModel]);
  });

  it('should return empty data when params is ref of null and load data after changing to valid params', async () => {
    expect.assertions(6);

    // given
    const findParams = ref<Params | null>(null);
    const serviceFind = vi.fn((params: Params) => {
      if (params.query && params.query.zug === 'start') {
        return [additionalTestModel];
      }
      return [testModel];
    });
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels', findParams);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([]);

    // when
    findParams.value = { query: { zug: 'start' } };
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
    expect(findComposition && findComposition.data.value).toStrictEqual([additionalTestModel]);
  });

  it('should set an error if something failed', async () => {
    expect.assertions(3);

    // given
    let serviceFindPromiseReject: (reason: FeathersError) => void = vi.fn();
    const serviceFind = vi.fn(
      () =>
        new Promise<TestModel[]>((resolve, reject) => {
          serviceFindPromiseReject = reject;
        }),
    );
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });

    // before when
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.error.value).toBeFalsy();

    // when
    serviceFindPromiseReject(new GeneralError('test error'));
    await flushPromises();

    // then
    expect(findComposition && findComposition.error.value).toBeTruthy();
  });

  it('should also load single entity response', async () => {
    expect.assertions(3);

    // given
    const serviceFind = vi.fn(() => testModel);

    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: vi.fn(),
        off: vi.fn(),
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);

    // when
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });
    await nextTick();

    // then
    expect(serviceFind).toHaveBeenCalledTimes(1);
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.data.value).toStrictEqual([testModel]);
  });

  describe('Event Handlers', () => {
    it('should listen to "create" events', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(additionalTestModel);
    });

    it('should listen to "create" events when query is matching', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { mood: additionalTestModel.mood } }));
      });
      await nextTick();

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(additionalTestModel);
    });

    it('should listen to "create" events when query is undefined', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: undefined }));
      });
      await nextTick();

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(additionalTestModel);
    });

    it('should ignore "create" events when query is not matching', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { mood: 'please-do-not-match' } }));
      });

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).not.toContainEqual(additionalTestModel);
    });

    it('should ignore "create" events when item already exists', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => [additionalTestModel]),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toHaveLength(1);
    });

    it('should listen to "patch" events', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => testModels),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // when
      emitter.emit('patched', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(changedTestModel);
    });

    it('should listen to "update" events', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => testModels),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(changedTestModel);
    });

    it('should keep order of items when handling "update" events', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => [additionalTestModel2, testModel, additionalTestModel]),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toHaveLength(3);
      expect(findComposition && findComposition.data.value[1]).toStrictEqual(changedTestModel);
    });

    it('should listen to "patch" & "update" events when query is matching', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => testModels),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { mood: changedTestModel.mood } }));
      });
      await nextTick();

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toContainEqual(changedTestModel);
    });

    it('should ignore "patch" & "update" events when query is not matching', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => testModels),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { mood: 'please-do-not-match' } }));
      });
      await nextTick();

      // when
      emitter.emit('updated', additionalTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).not.toContainEqual(additionalTestModel);
      expect(findComposition && findComposition.data.value).toContainEqual(testModel);
    });

    it('should listen to "patch" & "update" events and remove item from list when query is not matching anymore', async () => {
      expect.assertions(4);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => [testModel]),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { category: testModel.category } }));
      });

      // before then to ensure that the previous loading procedure is completed
      await nextTick();
      expect(findComposition && findComposition.isLoading.value).toBeFalsy();
      expect(findComposition && findComposition.data.value).toStrictEqual([testModel]);

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value.length).toBe(0);
    });

    it('should listen to "patch" & "update" events and add item to list when query is matching now', async () => {
      expect.assertions(4);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { category: changedTestModel.category } }));
      });

      // before then to ensure that the previous loading procedure is completed
      await nextTick();
      expect(findComposition && findComposition.isLoading.value).toBeFalsy();
      expect(findComposition && findComposition.data.value.length).toBe(0);

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual([changedTestModel]);
    });

    it('should listen to "patch" & "update" events and add item to list when query is undefined', async () => {
      expect.assertions(4);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => []),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: undefined }));
      });

      // before then to ensure that the previous loading procedure is completed
      await nextTick();
      expect(findComposition && findComposition.isLoading.value).toBeFalsy();
      expect(findComposition && findComposition.data.value.length).toBe(0);

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual([changedTestModel]);
    });

    it('should listen to "remove" events', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: vi.fn(() => testModels),
          on: emitter.on,
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // when
      emitter.emit('removed', testModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).not.toContainEqual(testModel);
    });

    it('should unload the event handlers', () => {
      expect.assertions(7);

      // given
      const serviceOff = vi.fn();
      const feathersOff = vi.fn();
      const feathersMock = {
        service: () => ({
          find: vi.fn(),
          on: vi.fn(),
          off: serviceOff,
        }),
        on: vi.fn(),
        off: feathersOff,
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      const wrapper = mountComposition(() => {
        findComposition = useFind('testModels');
      });

      // when
      wrapper.unmount();

      // then
      expect(findComposition).toBeTruthy();
      expect(feathersOff).toHaveBeenCalledTimes(1);
      expect(serviceOff).toHaveBeenCalledTimes(4);
      expect(serviceOff).toHaveBeenCalledWith('created', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('updated', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('patched', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('removed', expect.anything());
    });

    it('should not unload the event handlers when desired', () => {
      expect.assertions(3);

      // given
      const serviceOff = vi.fn();
      const feathersOff = vi.fn();
      const feathersMock = {
        service: () => ({
          find: vi.fn(),
          on: vi.fn(),
          off: serviceOff,
        }),
        on: vi.fn(),
        off: feathersOff,
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      const wrapper = mountComposition(() => {
        findComposition = useFind('testModels', ref({ paginate: false, query: {} }), {
          disableUnloadingEventHandlers: true,
        });
      });

      // when
      wrapper.unmount();

      // then
      expect(findComposition).toBeTruthy();
      expect(feathersOff).not.toHaveBeenCalled();
      expect(serviceOff).not.toHaveBeenCalled();
    });

    it('should unload the event handlers when desired', () => {
      expect.assertions(3);

      // given
      const serviceOff = vi.fn();
      const feathersOff = vi.fn();
      const feathersMock = {
        service: () => ({
          find: vi.fn(),
          on: vi.fn(),
          off: serviceOff,
        }),
        on: vi.fn(),
        off: feathersOff,
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      const findComposition = useFind('testModels', ref({ paginate: false, query: {} }));

      // when
      findComposition.unload();

      // then
      expect(findComposition).toBeTruthy();
      expect(feathersOff).toHaveBeenCalledTimes(1);
      expect(serviceOff).toHaveBeenCalledTimes(4); // unload of: created, updated, patched, removed events
    });
  });

  describe('pagination', () => {
    it('should handle paginated data', async () => {
      expect.assertions(3);

      // given
      let startItemIndex = 0;
      const serviceFind = vi.fn(() => {
        const page: Paginated<TestModel> = {
          total: testModels.length,
          skip: startItemIndex,
          limit: 1,
          data: testModels.slice(startItemIndex, startItemIndex + 1),
        };
        startItemIndex++;
        return page;
      });

      const feathersMock = {
        service: () => ({
          find: serviceFind,
          on: vi.fn(),
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);

      // when
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });
      await nextTick();

      // then
      expect(serviceFind).toHaveBeenCalledTimes(1);
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual(testModels.slice(0, 1));
    });

    it('should load all data with chunking', async () => {
      expect.assertions(3);

      // given
      let startItemIndex = 0;
      const serviceFind = vi.fn(() => {
        const page: Paginated<TestModel> = {
          total: testModels.length,
          skip: startItemIndex,
          limit: 1,
          data: testModels.slice(startItemIndex, startItemIndex + 1),
        };
        startItemIndex++;
        return page;
      });

      const feathersMock = {
        service: () => ({
          find: serviceFind,
          on: vi.fn(),
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);

      // when
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', undefined, { chunking: true });
      });
      await nextTick();

      // then
      expect(serviceFind).toHaveBeenCalledTimes(2);
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual(testModels);
    });

    it('should also load chunked data with lastEvaluatedKey patterns (misused $skip for it)', async () => {
      expect.assertions(3);

      // given
      const serviceFind = vi.fn((params?: Params) => {
        const startItemIndex = testModels.findIndex(({ _id }) => _id === params?.query?.$skip) + 1;
        const data = testModels.slice(startItemIndex, startItemIndex + 1);
        const page: Paginated<TestModel> = {
          total: testModels.length,
          skip: data[data.length - 1]._id as unknown as number,
          limit: 1,
          data,
        };
        return page;
      });

      const feathersMock = {
        service: () => ({
          find: serviceFind,
          on: vi.fn(),
          off: vi.fn(),
        }),
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);

      // when
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', undefined, { chunking: true });
      });
      await nextTick();

      // then
      expect(serviceFind).toHaveBeenCalledTimes(2);
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual(testModels);
    });

    it('should stop further page requests if find was retriggered due to e.g. reactivity', async () => {
      expect.assertions(3);

      // given
      let startItemIndex = 0;
      let data = [additionalTestModel, ...testModels];
      const serviceFind = vi.fn(() => {
        const page: Paginated<TestModel> = {
          total: data.length,
          skip: startItemIndex,
          limit: 1,
          data: data.slice(startItemIndex, startItemIndex + 1),
        };
        startItemIndex++;
        return page;
      });
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: serviceFind,
          on: vi.fn(),
          off: vi.fn(),
        }),
        on: emitter.on,
        off: vi.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', undefined, { chunking: true });
      });
      await nextTick();
      serviceFind.mockClear();
      data = testModels;
      startItemIndex = 0;

      // when
      emitter.emit('connect');
      await nextTick();
      await nextTick();

      // then
      expect(serviceFind).toHaveBeenCalledTimes(2);
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).toStrictEqual(testModels);
    });
  });
});
