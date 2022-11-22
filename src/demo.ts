import { Application } from '@feathersjs/feathers';
import { ref } from 'vue';

import { useFeathers } from './useFeathers';

type FS = {
  users: {
    _id: string;
    name: string;
  };
  messages: {
    _id: string;
    text: string;
  };
};

const feathersMock = {
  service: () => ({
    find() {},
    get() {},
    create() {},
    patch() {},
    update() {},
    remove() {},
    on() {},
    off() {},
  }),
  on() {},
  off() {},
} as unknown as Application<FS>;

const app = useFeathers(feathersMock);
const { data } = app('users').get(ref('1'));
const { data } = app('messages').find();
