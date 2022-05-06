import type { Application, FeathersService, Params, ServiceMethods } from '@feathersjs/feathers';
import sift from 'sift';
import { getCurrentInstance, onBeforeUnmount, Ref, ref, watch } from 'vue';

import { getId, ServiceModel, ServiceTypes } from './utils';

function loadServiceEventHandlers<
  CustomApplication extends Application,
  T extends keyof ServiceTypes<CustomApplication>,
  M,
>(
  service: FeathersService<CustomApplication, ServiceTypes<CustomApplication>[T]>,
  params: Ref<Params | undefined | null>,
  data: Ref<M[]>,
): () => void {
  const onCreated = (createdItem: M): void => {
    // ignore items not matching the query or when no params are set
    if (!params.value || !sift(params.value.query)(createdItem)) {
      return;
    }

    // ignore items that already exist
    if (data.value.find((item) => getId(createdItem) === getId(item)) !== undefined) {
      return;
    }

    data.value = [...data.value, createdItem];
  };

  const onRemoved = (item: M): void => {
    data.value = data.value.filter((_item) => getId(_item) !== getId(item));
  };

  const onItemChanged = (changedItem: M): void => {
    // ignore items not matching the query or when no params are set
    if (!params.value || !sift(params.value.query)(changedItem)) {
      // remove item from the list if they have been on it before
      data.value = data.value.filter((item) => getId(item) !== getId(changedItem));
      return;
    }

    let existing = false;
    data.value = data.value.map((item) => {
      if (getId(item) === getId(changedItem)) {
        existing = true;
        return changedItem;
      }

      return item;
    });

    if (!existing) {
      data.value = [...data.value, changedItem];
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  service.on('created', onCreated);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  service.on('removed', onRemoved);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  service.on('patched', onItemChanged);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  service.on('updated', onItemChanged);

  const unloadEventHandlers = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service.off('created', onCreated);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service.off('removed', onRemoved);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service.off('patched', onItemChanged);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    service.off('updated', onItemChanged);
  };

  return unloadEventHandlers;
}

export type UseFind<T> = {
  data: Ref<T[]>;
  isLoading: Ref<boolean>;
  unload: () => void;
};

// TODO: workaround, since extracting the type with ReturnType<T> does not work for generic functions. See https://stackoverflow.com/a/52964723
export type UseFindFunc<CustomApplication> = <
  T extends keyof ServiceTypes<CustomApplication>,
  M = ServiceModel<CustomApplication, T>,
>(
  serviceName: T,
  params?: Ref<Params | undefined | null>,
) => UseFind<M>;

export default <CustomApplication extends Application>(feathers: CustomApplication) =>
  <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    serviceName: T,
    params: Ref<Params | undefined | null> = ref({ paginate: false, query: {} }),
    { disableUnloadingEventHandlers } = { disableUnloadingEventHandlers: false },
  ): UseFind<M> => {
    // type cast is fine here (source: https://github.com/vuejs/vue-next/issues/2136#issuecomment-693524663)
    const data = ref<M[]>([]) as Ref<M[]>;
    const isLoading = ref(false);

    const service = feathers.service(serviceName as string);
    const unloadEventHandlers = loadServiceEventHandlers(service, params, data);

    const find = async () => {
      isLoading.value = true;
      if (!params.value) {
        data.value = [];
        isLoading.value = false;
        return;
      }

      // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
      // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
      const res = await (service as unknown as ServiceMethods<M>).find(params.value);
      data.value = Array.isArray(res) ? res : [res];
      isLoading.value = false;
    };

    const load = () => {
      void find();
    };

    const unload = () => {
      unloadEventHandlers();
      feathers.off('connect', load);
    };

    watch(params, load, { immediate: true });
    feathers.on('connect', load);

    if (disableUnloadingEventHandlers === false && getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    return { data, isLoading, unload };
  };
