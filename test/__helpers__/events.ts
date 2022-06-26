import { EventEmitter } from 'events';
import { Mock, vi } from 'vitest';

type EventHelper = {
  on: Mock<[event: string, listener: EventListener], void>;
  emit: Mock<[event: string, ...args: unknown[]], void>;
};

export const eventHelper = (): EventHelper => {
  const emitter = new EventEmitter();

  const on = vi.fn((event: string, listener: EventListener) => {
    emitter.on(event, listener);
  });

  const emit = vi.fn((event: string, ...args: unknown[]) => {
    emitter.emit(event, ...args);
  });

  return {
    on,
    emit,
  };
};
