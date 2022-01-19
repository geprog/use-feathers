import type { Application } from '@feathersjs/feathers';
import { nextTick, ref } from 'vue';

import useGetOriginal, { UseGet } from '~/useGet';
import { mountComposition } from '$/__helpers__/composition';
import { eventHelper } from '$/__helpers__/events';
import TestModel from '$/__helpers__/TestModel';

const testModel: TestModel = { _id: '111', mood: '😀', action: '🧘', category: 'enjoy' };
const additionalTestModel: TestModel = { _id: 'aaa', mood: '🤩', action: '🏄', category: 'sport' };
const changedTestModel: TestModel = { ...testModel, mood: '😅', action: '🏋️', category: 'sport' };

describe('Get composition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  it('should load data on mounted', async () => {
    expect.assertions(3);

    // given
    const serviceGet = jest.fn(() => testModel);
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);

    // when
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', ref(testModel._id));
    });
    await nextTick();

    // then
    expect(serviceGet).toHaveBeenCalledTimes(1);
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.data.value).toStrictEqual(testModel);
  });

  it('should load data after connect', async () => {
    expect.assertions(3);

    // given
    const serviceGet = jest.fn(() => testModel);
    const emitter = eventHelper();
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: emitter.on,
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', ref(testModel._id));
    });
    serviceGet.mockClear(); // continue with fresh mock

    // when
    emitter.emit('connect');
    await nextTick();

    // then
    expect(serviceGet).toHaveBeenCalledTimes(1);
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.data.value).toStrictEqual(testModel);
  });

  it('should indicate data loading', () => {
    expect.assertions(2);

    // given
    const feathersMock = {
      service: () => ({
        get: jest.fn(() => new Promise(() => null)),
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;

    // when
    mountComposition(() => {
      getComposition = useGet('testModels', ref(testModel._id));
    });

    // then
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.isLoading.value).toBeTruthy();
  });

  it('should indicate data finished loading', async () => {
    expect.assertions(2);

    // given
    let serviceGetPromiseResolve: (value: TestModel | PromiseLike<TestModel>) => void = jest.fn();
    const serviceGet = jest.fn(
      () =>
        new Promise<TestModel>((resolve) => {
          serviceGetPromiseResolve = resolve;
        }),
    );
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', ref(testModel._id));
    });

    // when
    serviceGetPromiseResolve(testModel);
    await nextTick();

    // then
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.isLoading.value).toBeFalsy();
  });

  it('should reload data after changing the id', async () => {
    expect.assertions(4);

    // given
    const testModelId = ref(testModel._id);
    const serviceGet = jest.fn((id) => {
      if (id === testModel._id) {
        return testModel;
      }
      return additionalTestModel;
    });
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', testModelId);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

    // when
    testModelId.value = additionalTestModel._id;
    await nextTick();

    // then
    expect(serviceGet).toHaveBeenCalledTimes(2);
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.data.value).toStrictEqual(additionalTestModel);
  });

  it('should un-load data after id changes to undefined', async () => {
    expect.assertions(5);

    // given
    const testModelId = ref<TestModel['_id'] | undefined>(testModel._id);
    const serviceGet = jest.fn((id) => {
      if (id === testModel._id) {
        return testModel;
      }
      return additionalTestModel;
    });
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', testModelId);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

    // when
    testModelId.value = undefined;
    await nextTick();

    // then
    expect(serviceGet).toHaveBeenCalledTimes(1);
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.isLoading.value).toBeFalsy();
    expect(getComposition && getComposition.data.value).toBeUndefined();
  });

  it('should return undefined when id is undefined and load data after changing to a valid id', async () => {
    expect.assertions(5);

    // given
    const testModelId = ref<string | undefined>(undefined);
    const serviceGet = jest.fn((id) => {
      if (id === testModel._id) {
        return testModel;
      }
      return additionalTestModel;
    });
    const feathersMock = {
      service: () => ({
        get: serviceGet,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useGet = useGetOriginal(feathersMock);
    let getComposition = null as UseGet<TestModel> | null;
    mountComposition(() => {
      getComposition = useGet('testModels', testModelId);
    });

    // before then to ensure that the previous loading procedure is completed
    await nextTick();
    expect(getComposition && getComposition.isLoading.value).toBeFalsy();
    expect(getComposition && getComposition.data.value).toBeUndefined();

    // when
    testModelId.value = additionalTestModel._id;
    await nextTick();

    // then
    expect(serviceGet).toHaveBeenCalledTimes(1);
    expect(getComposition).toBeTruthy();
    expect(getComposition && getComposition.data.value).toStrictEqual(additionalTestModel);
  });

  describe('Event Handlers', () => {
    it('should listen to "create" events', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(additionalTestModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toBeUndefined();

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toStrictEqual(additionalTestModel);
    });

    it('should ignore "create" event if ID does not match', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref('not-existing-id'));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toBeUndefined();

      // when
      emitter.emit('created', additionalTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toBeUndefined();
    });

    it('should listen to "patch" events', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(() => testModel),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

      // when
      emitter.emit('patched', changedTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toStrictEqual(changedTestModel);
    });

    it('should listen to "update" events', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(() => testModel),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toStrictEqual(changedTestModel);
    });

    it('should ignore "patch" & "update" events if ID does not match', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(() => testModel),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

      // when
      emitter.emit('updated', additionalTestModel);
      emitter.emit('patched', additionalTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);
    });

    it('should listen to "remove" events', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(() => testModel),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

      // when
      emitter.emit('removed', testModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toBeUndefined();
    });

    it('should ignore "remove" event if ID does not match', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          get: jest.fn(() => testModel),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // before then to ensure previous state
      await nextTick();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);

      // when
      emitter.emit('removed', additionalTestModel);

      // then
      expect(getComposition).toBeTruthy();
      expect(getComposition && getComposition.data.value).toStrictEqual(testModel);
    });

    it('should unmount the event handlers', () => {
      expect.assertions(7);

      // given
      const serviceOff = jest.fn();
      const feathersOff = jest.fn();
      const feathersMock = {
        service: () => ({
          get: jest.fn(),
          on: jest.fn(),
          off: serviceOff,
        }),
        on: jest.fn(),
        off: feathersOff,
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      let getComposition = null as UseGet<TestModel> | null;
      const wrapper = mountComposition(() => {
        getComposition = useGet('testModels', ref(testModel._id));
      });

      // when
      wrapper.unmount();

      // then
      expect(getComposition).toBeTruthy();
      expect(feathersOff).toHaveBeenCalledTimes(1);
      expect(serviceOff).toHaveBeenCalledTimes(4);
      expect(serviceOff).toHaveBeenCalledWith('created', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('updated', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('patched', expect.anything());
      expect(serviceOff).toHaveBeenCalledWith('removed', expect.anything());
    });

    it('should unmount the event handlers when desired', () => {
      expect.assertions(3);

      // given
      const serviceOff = jest.fn();
      const feathersOff = jest.fn();
      const feathersMock = {
        service: () => ({
          get: jest.fn(),
          on: jest.fn(),
          off: serviceOff,
        }),
        on: jest.fn(),
        off: feathersOff,
      } as unknown as Application;
      const useGet = useGetOriginal(feathersMock);
      const getComposition = useGet('testModels', ref(testModel._id), ref());

      // when
      getComposition.unload();

      // then
      expect(getComposition).toBeTruthy();
      expect(feathersOff).toHaveBeenCalledTimes(1);
      expect(serviceOff).toHaveBeenCalledTimes(4); // unload of: created, updated, patched, removed events
    });
  });
});
