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
  const onCreated = (item: M): void => {
    // ignore items not matching the query or when no params are set
    if (!params.value || !sift(params.value.query)(item)) {
      return;
    }

    data.value = [...data.value, item];
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

    data.value = data.value.map((item) => {
      if (getId(item) === getId(changedItem)) {
        return changedItem;
      }

      return item;
    });
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
  load: () => void;
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

    // check if composition was called from inside a component setup function
    if (getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    return { data, isLoading, load, unload };
  };
