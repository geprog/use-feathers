import { Application, FeathersService } from '@feathersjs/feathers';
import { reactive } from 'vue';

import { loadServiceEventHandlers } from './realtime';
import { PiniaStore, Store } from './store';
import useFind, { UseFindFunc } from './useFind';
import useGet, { UseGetFunc } from './useGet';
import { ServiceModel, ServiceTypes } from './utils';

type Service<T> = {
  find: UseFindFunc<T>;
  get: UseGetFunc<T>;
  create: FeathersService<T>['create'];
  update: FeathersService<T>['update'];
  patch: FeathersService<T>['patch'];
  remove: FeathersService<T>['remove'];
};

export type UseFeathers<CustomApplication> = <
  T extends keyof ServiceTypes<CustomApplication>,
  M = ServiceModel<CustomApplication, T>,
>(
  serviceName: T,
) => Service<M>;

const loadedServices = reactive(new Map<string, Service<unknown>>());

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useFeathers<CustomApplication extends Application>(
  feathers: CustomApplication,
  createStore?: <T extends keyof ServiceTypes<CustomApplication>, S = ServiceTypes<CustomApplication>[T]>(
    serviceName: T,
  ) => Store<S>,
) {
  type ServiceName = keyof ServiceTypes<CustomApplication>;

  return <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    _serviceName: T,
  ): Service<M> => {
    const serviceName = _serviceName as keyof ServiceName; // TODO: fix this

    // reuse existing service
    if (loadedServices.has(serviceName)) {
      return loadedServices.get(serviceName) as Service<M>;
    }

    const service = feathers.service(serviceName);
    const store = createStore ? createStore(serviceName) : PiniaStore(serviceName)();

    loadServiceEventHandlers(service, store);

    const _service = {
      find: useFind(feathers, store, serviceName) as UseFindFunc<M>,
      get: useGet(feathers, store, serviceName) as UseGetFunc<M>,
      create: service.create.bind(service),
      patch: service.patch.bind(service),
      update: service.update.bind(service),
      remove: service.remove.bind(service),
    };

    loadedServices.set(serviceName, _service);

    return _service;
  };
}
