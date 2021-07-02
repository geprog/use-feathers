import { Application } from '@feathersjs/feathers';
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
    jest.resetAllMocks();
    jest.resetModules();
  });

  it('should load data on mounted', async () => {
    expect.assertions(3);

    // given
    const serviceFind = jest.fn(() => testModels);

    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
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
    const serviceFind = jest.fn(() => testModels);
    const emitter = eventHelper();
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: emitter.on,
      off: jest.fn(),
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
        find: jest.fn(() => new Promise(() => null)),
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
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
    expect.assertions(2);

    // given
    let serviceFindPromiseResolve: (value: TestModel[] | PromiseLike<TestModel[]>) => void = jest.fn();
    const serviceFind = jest.fn(
      () =>
        new Promise<TestModel[]>((resolve) => {
          serviceFindPromiseResolve = resolve;
        }),
    );
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    let findComposition = null as UseFind<TestModel> | null;
    mountComposition(() => {
      findComposition = useFind('testModels');
    });

    // when
    serviceFindPromiseResolve(testModels);
    await nextTick();

    // then
    expect(findComposition).toBeTruthy();
    expect(findComposition && findComposition.isLoading.value).toBeFalsy();
  });

  it('should reload data after changing the params', async () => {
    expect.assertions(2);

    // given
    const findParams = ref({ query: { zug: 'start' } });
    const serviceFind = jest.fn(() => Promise.resolve([]));
    const feathersMock = {
      service: () => ({
        find: serviceFind,
        on: jest.fn(),
        off: jest.fn(),
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Application;
    const useFind = useFindOriginal(feathersMock);
    mountComposition(() => {
      useFind('testModels', findParams);
    });

    // when
    findParams.value.query = { zug: 'change' };
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

  describe('Event Handlers', () => {
    it('should listen to "create" events', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => []),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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
          find: jest.fn(() => []),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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

    it('should ignore "create" events when query is not matching', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => []),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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

    it('should listen to "patch" events', async () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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

    it('should listen to "patch" & "update" events when query is matching', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { mood: 'please-do-not-match' } }));
      });

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).not.toContainEqual(changedTestModel);
    });

    it('should ignore "patch" & "update" events when query is not matching', async () => {
      expect.assertions(3);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
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

    it('should listen to "patch" & "update" events and remove item from list when query is not matching anymore', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels', ref({ query: { category: testModel.category } }));
      });

      // when
      emitter.emit('updated', changedTestModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value.length).toStrictEqual(0);
    });

    it('should listen to "remove" events', () => {
      expect.assertions(2);

      // given
      const emitter = eventHelper();
      const feathersMock = {
        service: () => ({
          find: jest.fn(() => testModels),
          on: emitter.on,
          off: jest.fn(),
        }),
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Application;
      const useFind = useFindOriginal(feathersMock);
      let findComposition = null as UseFind<TestModel> | null;
      mountComposition(() => {
        findComposition = useFind('testModels');
      });

      // when
      emitter.emit('removed', testModel);

      // then
      expect(findComposition).toBeTruthy();
      expect(findComposition && findComposition.data.value).not.toContainEqual(testModel);
    });

    it('should unmount the event handlers', () => {
      expect.assertions(7);

      // given
      const serviceOff = jest.fn();
      const feathersOff = jest.fn();
      const feathersMock = {
        service: () => ({
          find: jest.fn(),
          on: jest.fn(),
          off: serviceOff,
        }),
        on: jest.fn(),
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
    it('should not unmount the event handlers when desired', () => {
      expect.assertions(3);

      // given
      const serviceOff = jest.fn();
      const feathersOff = jest.fn();
      const feathersMock = {
        service: () => ({
          find: jest.fn(),
          on: jest.fn(),
          off: serviceOff,
        }),
        on: jest.fn(),
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
  });
});
