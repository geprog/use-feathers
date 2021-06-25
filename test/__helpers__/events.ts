import { EventEmitter } from 'events';

type EventHelper = {
  on: jest.Mock<void, [event: string, listener: EventListener]>;
  emit: jest.Mock<void, [event: string, ...args: unknown[]]>;
};

export const eventHelper = (): EventHelper => {
  const emitter = new EventEmitter();

  const on = jest.fn((event: string, listener: EventListener) => {
    emitter.on(event, listener);
  });

  const emit = jest.fn((event: string, ...args: unknown[]) => {
    emitter.emit(event, ...args);
  });

  return {
    on,
    emit,
  };
};
