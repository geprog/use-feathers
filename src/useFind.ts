import { AdapterService } from '@feathersjs/adapter-commons/lib';
import type { FeathersError } from '@feathersjs/errors';
import type { Application, FeathersService, Paginated, Params, Query, ServiceMethods } from '@feathersjs/feathers';
import sift from 'sift';
import { getCurrentInstance, onBeforeUnmount, Ref, ref, watch } from 'vue';

import { getId, isPaginated, ServiceModel, ServiceTypes } from './utils';

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
    if (!params.value || (params.value.query !== undefined && !sift(params.value.query)(createdItem))) {
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
    if (!params.value || (params.value.query !== undefined && !sift(params.value.query)(changedItem))) {
      // remove item from the list if they have been on it before
      data.value = data.value.filter((item) => getId(item) !== getId(changedItem));
      return;
    }

    const itemIndex = data.value.findIndex((item) => getId(item) === getId(changedItem));
    if (itemIndex === -1) {
      data.value = [...data.value, changedItem];
    } else {
      data.value = [...data.value.slice(0, itemIndex), changedItem, ...data.value.slice(itemIndex + 1)];
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
  error: Ref<FeathersError | undefined>;
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

type Options = {
  disableUnloadingEventHandlers: boolean;
  chunking: boolean;
};

const defaultOptions: Options = { disableUnloadingEventHandlers: false, chunking: false };

export default <CustomApplication extends Application>(feathers: CustomApplication) =>
  <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    serviceName: T,
    params: Ref<Params | undefined | null> = ref({ paginate: false, query: {} }),
    options: Partial<Options> = {},
  ): UseFind<M> => {
    const { disableUnloadingEventHandlers, chunking } = { ...defaultOptions, ...options };
    // type cast is fine here (source: https://github.com/vuejs/vue-next/issues/2136#issuecomment-693524663)
    const data = ref<M[]>([]) as Ref<M[]>;
    const isLoading = ref(false);
    const error = ref<FeathersError>();

    const service = feathers.service(serviceName as string);
    const unloadEventHandlers = loadServiceEventHandlers(service, params, data);
    let unloaded = false;

    const currentFindCall = ref(0);

    const find = async (call: number) => {
      isLoading.value = true;
      error.value = undefined;

      if (!params.value) {
        data.value = [];
        isLoading.value = false;
        return;
      }

      try {
        const originalParams: Params = params.value;
        const originalQuery: Query & { $limit?: number } = originalParams.query || {};
        // TODO: the typecast below is necessary due to the prerelease state of feathers v5. The problem there is
        // that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface.
        const res = await (service as unknown as ServiceMethods<M> | AdapterService<M>).find(originalParams);
        if (call !== currentFindCall.value) {
          // stop handling response since there already is a new find call running within this composition
          return;
        }
        if (isPaginated(res)) {
          // extract data from page response
          let loadedPage: Paginated<M> = res;
          let loadedItemsCount = loadedPage.data.length;
          data.value = [...loadedPage.data];
          // limit might not be specified in the original query if default pagination from backend is applied, that's why we use this fallback pattern
          const limit: number = originalQuery.$limit || loadedPage.data.length;
          // if chunking is enabled we go on requesting all following pages until all data have been received
          while (chunking && !unloaded && loadedPage.total > loadedItemsCount) {
            // skip can be a string in cases where key based chunking/pagination is done e.g. in DynamoDb via `LastEvaluatedKey`
            const skip: string | number =
              typeof loadedPage.skip === 'string' ? loadedPage.skip : loadedPage.skip + limit;
            // request next page
            loadedPage = (await (service as unknown as ServiceMethods<M> | AdapterService<M>).find({
              ...originalParams,
              query: { ...originalQuery, $skip: skip, $limit: limit },
            })) as Paginated<M>;
            if (call !== currentFindCall.value) {
              // stop handling/requesting further pages since there already is a new find call running within this composition
              return;
            }
            loadedItemsCount += loadedPage.data.length;
            data.value = [...data.value, ...loadedPage.data];
          }
        } else {
          data.value = Array.isArray(res) ? res : [res];
        }
      } catch (_error) {
        error.value = _error as FeathersError;
      }

      isLoading.value = false;
    };

    const load = () => {
      currentFindCall.value = currentFindCall.value + 1;
      void find(currentFindCall.value);
    };

    const unload = () => {
      unloaded = true;
      unloadEventHandlers();
      feathers.off('connect', load);
    };

    watch(params, load, { immediate: true });
    feathers.on('connect', load);

    if (disableUnloadingEventHandlers === false && getCurrentInstance()) {
      onBeforeUnmount(unload);
    }

    return { data, isLoading, unload, error };
  };
