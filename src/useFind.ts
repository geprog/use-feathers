import type { FeathersError } from '@feathersjs/errors';
import type { Application, Params, ServiceMethods } from '@feathersjs/feathers';
import sift from 'sift';
import { computed, getCurrentInstance, onBeforeUnmount, Ref, ref, watch } from 'vue';

import { Store } from './store';
import { getId, ServiceModel, ServiceTypes } from './utils';

export type UseFind<T> = {
  data: Ref<T[]>;
  isLoading: Ref<boolean>;
  error: Ref<FeathersError | undefined>;
  unload: () => void;
};

// TODO: workaround, since extracting the type with ReturnType<T> does not work for generic functions. See https://stackoverflow.com/a/52964723
export type UseFindFunc<M> = (
  params?: Ref<Params | undefined | null>,
  options?: { disableUnloadingEventHandlers: boolean },
) => UseFind<M>;

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
    params: Ref<Params | undefined | null> = ref({ paginate: false, query: {} }),
    options = { disableUnloadingEventHandlers: false },
  ): UseFind<M> => {
    const isLoading = ref(false);
    const error = ref<FeathersError>();

    const service = feathers.service(serviceName as string);

    const find = async () => {
      isLoading.value = true;
      error.value = undefined;

      if (!params.value) {
        isLoading.value = false;
        return;
      }

      try {
        // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
        // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
        const res = await (service as unknown as ServiceMethods<M>).find(params.value);
        const items = Array.isArray(res) ? res : [res];
        for (const item of items) {
          store.setRecord(getId(item), item);
        }
      } catch (_error) {
        error.value = _error as FeathersError;
      }

      isLoading.value = false;
    };

    const load = () => {
      void find();
    };

    const unload = () => {
      feathers.off('connect', load);
    };

    watch(params, load, { immediate: true });
    feathers.on('connect', load);

    if (options.disableUnloadingEventHandlers === false && getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    const filter = computed(
      () => (record: M) => !params.value || (params.value.query !== undefined && !sift(params.value.query)(record)),
    );
    const data = store.getFilteredRecords(filter);

    return { data, isLoading, unload, error };
  };
