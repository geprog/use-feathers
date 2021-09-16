# Vue.js compositions for Feathers

Provides `get` and `find` compositions that let you query your feathers API.  
Queries and responses are fully reactive allowing you to:

- trigger a query by simply updating a query parameter
- receive continuous updates via [@feathersjs/socketio-client](https://docs.feathersjs.com/api/client/socketio.html) that are instantly visible inside Vue components.

## Example usage

Define a wrapper that passes your feathers app.  
Passing your `Application` type including your `ServiceTypes` allows typechecking of the `serviceName` parameter.

```ts
// useFindWrapper.ts
import { useFind } from '@geprog/use-feathers';
import { Application as FeathersApplication } from '@feathersjs/feathers';
import { AdapterService } from '@feathersjs/adapter-commons';
import { Car } from './model';

type ServiceTypes = {
  cars: AdapterService<Car>;
};

type Application = FeathersApplication<ServiceTypes>;

export const useFindWrapper = useFind<Application>(yourFeathersApp);
```

Inside a Vue component call the wrapper with a `serviceName` and a Params ref containing your query.

```ts
import { computed, defineComponent } from 'vue';
import { useFindWrapper } from './useFindWrapper';

export default defineComponent({
  setup() {
    const seats = ref(4);
    const { data: cars, isLoading } = useFindWrapper(
      'cars',
      computed(() => ({ paginate: false, query: { seats: seats.value } })),
    );
    return { seats, cars, isLoading };
  },
});
```
