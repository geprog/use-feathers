import { Application, FeathersService } from '@feathersjs/feathers/lib';

import { Store } from './store';
import { getId, ServiceTypes } from './utils';

export function loadServiceEventHandlers<
  CustomApplication extends Application,
  T extends keyof ServiceTypes<CustomApplication>,
  M,
>(service: FeathersService<CustomApplication, ServiceTypes<CustomApplication>[T]>, store: Store<M>): () => void {
  const onCreated = (createdItem: M): void => {
    store.setRecord(getId(createdItem), createdItem);
  };

  const onRemoved = (item: M): void => {
    store.removeRecord(getId(item));
  };

  const onItemChanged = (changedItem: M): void => {
    store.setRecord(getId(changedItem), changedItem);
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
