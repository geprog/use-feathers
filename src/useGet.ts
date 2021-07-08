import { Application, FeathersService, Id, ServiceMethods } from '@feathersjs/feathers';
import { onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';

import { getId, ServiceModel, ServiceTypes } from './utils';

function loadServiceEventHandlers<
  CustomApplication extends Application,
  T extends keyof ServiceTypes<CustomApplication>,
  M,
  >(
    service: FeathersService<CustomApplication, ServiceTypes<CustomApplication>[T]>,
    _id: Ref<Id | undefined>,
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

  service.on('created', onCreated);
  service.on('removed', onRemoved);
  service.on('patched', onItemChanged);
  service.on('updated', onItemChanged);

  const unloadEventHandlers = () => {
    service.off('created', onCreated);
    service.off('removed', onRemoved);
    service.off('patched', onItemChanged);
    service.off('updated', onItemChanged);
  };

  return unloadEventHandlers;
}

export type UseGet<T> = {
  data: Ref<T | undefined>;
  isLoading: Ref<boolean>;
};

// TODO: workaround, since extracting the type with ReturnType<T> does not work for generic functions. See https://stackoverflow.com/a/52964723
export type UseGetFunc<CustomApplication> = <
  T extends keyof ServiceTypes<CustomApplication>,
  M = ServiceModel<CustomApplication, T>,
  >(
  serviceName: T,
  _id: Ref<Id | undefined>,
) => UseGet<M>;

export default <CustomApplication extends Application>(feathers: CustomApplication) =>
  <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    serviceName: T,
    _id: Ref<Id | undefined>,
    { disableUnloadingEventHandlers } = { disableUnloadingEventHandlers: false },
  ): UseGet<M> => {
    const data = ref<M>();
    const isLoading = ref(false);

    const service = feathers.service(serviceName as string);

    const unloadEventHandlers = loadServiceEventHandlers(service, _id, data);

    const get = async () => {
      isLoading.value = true;
      if (!_id.value) {
        data.value = undefined;
        return;
      }
      // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
      // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
      data.value = await (service as unknown as ServiceMethods<M>).get(_id.value);
      isLoading.value = false;
    };

    watch(_id, async () => {
      await get();
    });

    const connectListener = () => {
      void get();
    };

    feathers.on('connect', connectListener);

    onMounted(async () => {
      await get();
    });

    if (!disableUnloadingEventHandlers) {
      onBeforeUnmount(() => {
        unloadEventHandlers();
        feathers.off('connect', connectListener);
      });
    }

    return { isLoading, data };
  };
