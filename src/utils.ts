import type { AdapterService } from '@feathersjs/adapter-commons';
import type { Application, Id, Paginated, ServiceMethods } from '@feathersjs/feathers';

export type PotentialIds = {
  id?: Id;
  _id?: Id;
};

export function getId(item: PotentialIds): Id {
  if (item.id) {
    return item.id;
  }
  if (item._id) {
    return item._id;
  }
  throw new Error('Unable to retrieve id from item');
}

export type ServiceTypes<CustomApplication> = CustomApplication extends Application<infer S> ? S : never;

// TODO: the checks below are necessary due to the prerelease state of feathers v5. The problem there is
// that the AdapterService interface is not yet updated and is not compatible with the ServiceMethods interface
// and therefor needs to be checked separately.
export type ServiceModel<
  CustomApplication,
  T extends keyof ServiceTypes<CustomApplication>,
> = ServiceTypes<CustomApplication>[T] extends AdapterService<infer M1>
  ? M1
  : ServiceTypes<CustomApplication>[T] extends ServiceMethods<infer M2>
  ? M2
  : never;

export function isPaginated<T>(response: T | T[] | Paginated<T>): response is Paginated<T> {
  const { total, limit, skip, data } = response as Paginated<T>;
  return (
    typeof total === 'number' &&
    typeof limit === 'number' &&
    (typeof skip === 'number' || typeof skip === 'string') &&
    Array.isArray(data)
  );
}
