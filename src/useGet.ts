import type { Application, FeathersService, Id, Params, ServiceMethods } from '@feathersjs/feathers';
import { getCurrentInstance, onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';

import { getId, ServiceModel, ServiceTypes } from './utils';

function loadServiceEventHandlers<
  CustomApplication extends Application,
  T extends keyof ServiceTypes<CustomApplication>,
  M,
>(
  service: FeathersService<CustomApplication, ServiceTypes<CustomApplication>[T]>,
  _id: Ref<Id | undefined | null>,
  data: Ref<M | undefined>,
): () => void {
  const onCreated = (item: M): void => {
    if (_id.value === getId(item)) {
      data.value = item;
    }
  };

  const onRemoved = (item: M): void => {
    if (_id.value === getId(item)) {
      data.value = undefined;
    }
  };

  const onItemChanged = (item: M): void => {
    if (_id.value === getId(item)) {
      data.value = item;
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

export type UseGet<T> = {
  data: Ref<T | undefined>;
  isLoading: Ref<boolean>;
  load: () => void;
  unload: () => void;
};

// TODO: workaround, since extracting the type with ReturnType<T> does not work for generic functions. See https://stackoverflow.com/a/52964723
export type UseGetFunc<CustomApplication> = <
  T extends keyof ServiceTypes<CustomApplication>,
  M = ServiceModel<CustomApplication, T>,
>(
  serviceName: T,
  _id: Ref<Id | undefined | null>,
) => UseGet<M>;

export default <CustomApplication extends Application>(feathers: CustomApplication) =>
  <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    serviceName: T,
    _id: Ref<Id | undefined | null>,
    params: Ref<Params | undefined> = ref(),
  ): UseGet<M> => {
    const data = ref<M>();
    const isLoading = ref(false);

    const service = feathers.service(serviceName as string);

    const unloadEventHandlers = loadServiceEventHandlers(service, _id, data);

    const get = async () => {
      isLoading.value = true;
      if (!_id.value) {
        data.value = undefined;
        isLoading.value = false;
        return;
      }
      // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
      // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
      data.value = await (service as unknown as ServiceMethods<M>).get(_id.value, params.value);
      isLoading.value = false;
    };

    const load = () => {
      void get();
    };
    
    const unload = () => {
      unloadEventHandlers();
      feathers.off('connect', load);
    };

    watch(_id, load, { immediate: true });
    feathers.on('connect', load);

    // check if composition was called from inside a component setup function
    if (getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    return { isLoading, data };
  };
