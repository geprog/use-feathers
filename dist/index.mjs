var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/useFind.ts
import sift from "sift";
import { getCurrentInstance, onBeforeUnmount, ref, watch } from "vue";

// src/utils.ts
function getId(item) {
  if (item.id) {
    return item.id;
  }
  if (item._id) {
    return item._id;
  }
  throw new Error("Unable to retrieve id from item");
}
function isPaginated(response) {
  const { total, limit, skip, data } = response;
  return typeof total === "number" && typeof limit === "number" && (typeof skip === "number" || typeof skip === "string") && Array.isArray(data);
}

// src/useFind.ts
function loadServiceEventHandlers(service, params, data, isLoading) {
  const eventCache = [];
  const onCreated = (createdItem) => {
    if (isLoading.value) {
      eventCache.push(() => onCreated(createdItem));
      return;
    }
    if (!params.value || params.value.query !== void 0 && !sift(params.value.query)(createdItem)) {
      return;
    }
    if (data.value.find((item) => getId(createdItem) === getId(item)) !== void 0) {
      return;
    }
    data.value = [...data.value, createdItem];
  };
  const onRemoved = (item) => {
    if (isLoading.value) {
      eventCache.push(() => onRemoved(item));
      return;
    }
    data.value = data.value.filter((_item) => getId(_item) !== getId(item));
  };
  const onItemChanged = (changedItem) => {
    if (isLoading.value) {
      eventCache.push(() => onItemChanged(changedItem));
      return;
    }
    const existingItem = data.value.find((item) => getId(item) === getId(changedItem));
    const newItem = __spreadValues(__spreadValues({}, existingItem), changedItem);
    if (!params.value || params.value.query !== void 0 && !sift(params.value.query)(newItem)) {
      data.value = data.value.filter((item) => getId(item) !== getId(newItem));
      return;
    }
    const itemIndex = data.value.findIndex((item) => getId(item) === getId(newItem));
    if (itemIndex === -1) {
      data.value = [...data.value, newItem];
    } else {
      data.value = [...data.value.slice(0, itemIndex), newItem, ...data.value.slice(itemIndex + 1)];
    }
  };
  service.on("created", onCreated);
  service.on("removed", onRemoved);
  service.on("patched", onItemChanged);
  service.on("updated", onItemChanged);
  const unloadEventHandlers = () => {
    service.off("created", onCreated);
    service.off("removed", onRemoved);
    service.off("patched", onItemChanged);
    service.off("updated", onItemChanged);
  };
  watch(isLoading, () => {
    while (eventCache.length > 0 && !isLoading.value) {
      const event = eventCache.shift();
      if (event) {
        event();
      }
    }
  });
  return unloadEventHandlers;
}
var defaultOptions = { disableUnloadingEventHandlers: false, loadAllPages: false };
var useFind_default = (feathers) => (serviceName, params = ref({ paginate: false, query: {} }), options = {}) => {
  const { disableUnloadingEventHandlers, loadAllPages } = __spreadValues(__spreadValues({}, defaultOptions), options);
  const data = ref([]);
  const isLoading = ref(false);
  const error = ref();
  const service = feathers.service(serviceName);
  const unloadEventHandlers = loadServiceEventHandlers(service, params, data, isLoading);
  let unloaded = false;
  const currentFindCall = ref(0);
  const find = async (call) => {
    isLoading.value = true;
    error.value = void 0;
    if (!params.value) {
      data.value = [];
      isLoading.value = false;
      return;
    }
    try {
      const originalParams = params.value;
      const originalQuery = originalParams.query || {};
      const res = await service.find(originalParams);
      if (call !== currentFindCall.value) {
        return;
      }
      if (isPaginated(res) && !loadAllPages) {
        data.value = [...res.data];
      } else if (!isPaginated(res)) {
        data.value = Array.isArray(res) ? res : [res];
      } else {
        let loadedPage = res;
        let loadedItemsCount = loadedPage.data.length;
        data.value = [...loadedPage.data];
        const limit = originalQuery.$limit || loadedPage.data.length;
        while (!unloaded && loadedPage.total > loadedItemsCount) {
          const skip = typeof loadedPage.skip === "string" ? loadedPage.skip : loadedPage.skip + limit;
          loadedPage = await service.find(__spreadProps(__spreadValues({}, originalParams), {
            query: __spreadProps(__spreadValues({}, originalQuery), { $skip: skip, $limit: limit })
          }));
          if (call !== currentFindCall.value) {
            return;
          }
          loadedItemsCount += loadedPage.data.length;
          data.value = [...data.value, ...loadedPage.data];
        }
      }
    } catch (_error) {
      error.value = _error;
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
    feathers.off("connect", load);
  };
  watch(params, load, { immediate: true });
  feathers.on("connect", load);
  if (disableUnloadingEventHandlers === false && getCurrentInstance()) {
    onBeforeUnmount(unload);
  }
  return { data, isLoading, unload, error };
};

// src/useGet.ts
import { getCurrentInstance as getCurrentInstance2, onBeforeUnmount as onBeforeUnmount2, ref as ref2, watch as watch2 } from "vue";
function loadServiceEventHandlers2(service, _id, data) {
  const onCreated = (item) => {
    if (_id.value === getId(item)) {
      data.value = item;
    }
  };
  const onRemoved = (item) => {
    if (_id.value === getId(item)) {
      data.value = void 0;
    }
  };
  const onItemChanged = (item) => {
    if (_id.value === getId(item)) {
      data.value = __spreadValues(__spreadValues({}, data.value), item);
    }
  };
  service.on("created", onCreated);
  service.on("removed", onRemoved);
  service.on("patched", onItemChanged);
  service.on("updated", onItemChanged);
  const unloadEventHandlers = () => {
    service.off("created", onCreated);
    service.off("removed", onRemoved);
    service.off("patched", onItemChanged);
    service.off("updated", onItemChanged);
  };
  return unloadEventHandlers;
}
var useGet_default = (feathers) => (serviceName, _id, params = ref2(), { disableUnloadingEventHandlers } = { disableUnloadingEventHandlers: false }) => {
  const data = ref2();
  const isLoading = ref2(false);
  const error = ref2();
  const service = feathers.service(serviceName);
  const unloadEventHandlers = loadServiceEventHandlers2(service, _id, data);
  const get = async () => {
    isLoading.value = true;
    error.value = void 0;
    if (!_id.value) {
      data.value = void 0;
      isLoading.value = false;
      return;
    }
    try {
      data.value = await service.get(_id.value, params.value);
    } catch (_error) {
      error.value = _error;
    }
    isLoading.value = false;
  };
  const load = () => {
    void get();
  };
  const unload = () => {
    unloadEventHandlers();
    feathers.off("connect", load);
  };
  watch2(_id, load, { immediate: true });
  feathers.on("connect", load);
  if (disableUnloadingEventHandlers === false && getCurrentInstance2()) {
    onBeforeUnmount2(unload);
  }
  return { isLoading, data, error, unload };
};
export {
  useFind_default as useFind,
  useGet_default as useGet
};
