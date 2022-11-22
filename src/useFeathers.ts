import { Application, FeathersService } from '@feathersjs/feathers';

import { loadServiceEventHandlers } from './realtime';
import { BasicStore, Store } from './store';
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

type FService<
  CustomApplication extends Application,
  T extends keyof ServiceTypes<CustomApplication>[T],
> = ServiceTypes<CustomApplication>[T];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useFeathers<CustomApplication extends Application>(
  feathers: CustomApplication,
  createStore?: <T extends keyof ServiceTypes<CustomApplication>, S = ServiceTypes<CustomApplication>[T]>(
    serviceName: T,
  ) => Store<S>,
) {
  const serviceNames = Object.keys(feathers.services as Record<string, unknown>);

  const services = serviceNames.reduce((acc, serviceName) => {
    const service = feathers.service(serviceName);
    const store = createStore ? createStore(serviceName) : new BasicStore();

    loadServiceEventHandlers(service, store);

    acc[serviceName] = {
      find: useFind(feathers, store, serviceName),
      get: useGet(feathers, store, serviceName),
      create: service.create.bind(service),
      patch: service.patch.bind(service),
      update: service.update.bind(service),
      remove: service.remove.bind(service),
    };
    return acc;
  }, {} as { [serviceName in ServiceTypes<CustomApplication>]: FService<CustomApplication, serviceName> });

  return <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(
    serviceName: T,
  ): Service<M> => {
    const service = services[serviceName as string] as Service<M>;
    if (!service) {
      throw new Error(`Service ${serviceName as string} does not exist`);
    }
    return service;
  };
}
