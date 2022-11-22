import type { FeathersError } from '@feathersjs/errors';
import type { Application, Id, Params, ServiceMethods } from '@feathersjs/feathers';
import { getCurrentInstance, onBeforeUnmount, Ref, ref, watch } from 'vue';

import { Store } from './store';
import { getId, ServiceModel, ServiceTypes } from './utils';

export type UseGet<T> = {
  data: Ref<T | undefined>;
  isLoading: Ref<boolean>;
  error: Ref<FeathersError | undefined>;
  unload: () => void;
};

// TODO: workaround, since extracting the type with ReturnType<T> does not work for generic functions. See https://stackoverflow.com/a/52964723
export type UseGetFunc<M> = (
  _id: Ref<Id | undefined | null>,
  params?: Ref<Params | undefined>,
  options?: { disableUnloadingEventHandlers: boolean },
) => UseGet<M>;

export default <
    CustomApplication extends Application,
    T extends keyof ServiceTypes<CustomApplication>,
    M = ServiceModel<CustomApplication, T>,
  >(
    feathers: CustomApplication,
    store: Store<M>,
    serviceName: T,
  ) =>
  (
    _id: Ref<Id | undefined | null>,
    params: Ref<Params | undefined> = ref(),
    { disableUnloadingEventHandlers } = { disableUnloadingEventHandlers: false },
  ): UseGet<M> => {
    const isLoading = ref(false);
    const error = ref<FeathersError>();

    const service = feathers.service(serviceName as string);

    const get = async () => {
      isLoading.value = true;
      error.value = undefined;

      if (!_id.value) {
        isLoading.value = false;
        return;
      }

      try {
        // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
        // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
        const item = await (service as unknown as ServiceMethods<M>).get(_id.value, params.value);
        store.setRecord(getId(item), item);
      } catch (_error) {
        error.value = _error as FeathersError;
      }

      isLoading.value = false;
    };

    const load = () => {
      void get();
    };

    const unload = () => {
      feathers.off('connect', load);
    };

    watch(_id, load, { immediate: true });
    feathers.on('connect', load);

    if (disableUnloadingEventHandlers === false && getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    const data = store.getRecord(_id);

    return { isLoading, data, error, unload };
  };
