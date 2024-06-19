import { FeathersError } from '@feathersjs/errors';
import { Application, ServiceMethods, Params, Id } from '@feathersjs/feathers';
import { Ref } from 'vue';
import { AdapterService } from '@feathersjs/adapter-commons';

declare type ServiceTypes<CustomApplication> = CustomApplication extends Application<infer S> ? S : never;
declare type ServiceModel<CustomApplication, T extends keyof ServiceTypes<CustomApplication>> = ServiceTypes<CustomApplication>[T] extends AdapterService<infer M1> ? M1 : ServiceTypes<CustomApplication>[T] extends ServiceMethods<infer M2> ? M2 : never;

declare type UseFind<T> = {
    data: Ref<T[]>;
    isLoading: Ref<boolean>;
    error: Ref<FeathersError | undefined>;
    unload: () => void;
};
declare type UseFindFunc<CustomApplication> = <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(serviceName: T, params?: Ref<Params | undefined | null>) => UseFind<M>;
declare type Options = {
    disableUnloadingEventHandlers: boolean;
    loadAllPages: boolean;
};
declare const _default$1: <CustomApplication extends Application<any, any>>(feathers: CustomApplication) => <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(serviceName: T, params?: Ref<Params | undefined | null>, options?: Partial<Options>) => UseFind<M>;

declare type UseGet<T> = {
    data: Ref<T | undefined>;
    isLoading: Ref<boolean>;
    error: Ref<FeathersError | undefined>;
    unload: () => void;
};
declare type UseGetFunc<CustomApplication> = <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(serviceName: T, _id: Ref<Id | undefined | null>) => UseGet<M>;
declare const _default: <CustomApplication extends Application<any, any>>(feathers: CustomApplication) => <T extends keyof ServiceTypes<CustomApplication>, M = ServiceModel<CustomApplication, T>>(serviceName: T, _id: Ref<Id | undefined | null>, params?: Ref<Params | undefined>, { disableUnloadingEventHandlers }?: {
    disableUnloadingEventHandlers: boolean;
}) => UseGet<M>;

export { ServiceModel, ServiceTypes, UseFind, UseFindFunc, UseGet, UseGetFunc, _default$1 as useFind, _default as useGet };
