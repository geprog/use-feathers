var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  useFind: () => useFind_default,
  useGet: () => useGet_default
});

// src/useFind.ts
var import_sift = __toESM(require("sift"));
var import_vue = require("vue");

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
    if (!params.value || params.value.query !== void 0 && !(0, import_sift.default)(params.value.query)(createdItem)) {
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
    if (!params.value || params.value.query !== void 0 && !(0, import_sift.default)(params.value.query)(newItem)) {
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
  (0, import_vue.watch)(isLoading, () => {
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
var useFind_default = (feathers) => (serviceName, params = (0, import_vue.ref)({ paginate: false, query: {} }), options = {}) => {
  const { disableUnloadingEventHandlers, loadAllPages } = __spreadValues(__spreadValues({}, defaultOptions), options);
  const data = (0, import_vue.ref)([]);
  const isLoading = (0, import_vue.ref)(false);
  const error = (0, import_vue.ref)();
  const service = feathers.service(serviceName);
  const unloadEventHandlers = loadServiceEventHandlers(service, params, data, isLoading);
  let unloaded = false;
  const currentFindCall = (0, import_vue.ref)(0);
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
  (0, import_vue.watch)(params, load, { immediate: true });
  feathers.on("connect", load);
  if (disableUnloadingEventHandlers === false && (0, import_vue.getCurrentInstance)()) {
    (0, import_vue.onBeforeUnmount)(unload);
  }
  return { data, isLoading, unload, error };
};

// src/useGet.ts
var import_vue2 = require("vue");
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
var useGet_default = (feathers) => (serviceName, _id, params = (0, import_vue2.ref)(), { disableUnloadingEventHandlers } = { disableUnloadingEventHandlers: false }) => {
  const data = (0, import_vue2.ref)();
  const isLoading = (0, import_vue2.ref)(false);
  const error = (0, import_vue2.ref)();
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
  (0, import_vue2.watch)(_id, load, { immediate: true });
  feathers.on("connect", load);
  if (disableUnloadingEventHandlers === false && (0, import_vue2.getCurrentInstance)()) {
    (0, import_vue2.onBeforeUnmount)(unload);
  }
  return { isLoading, data, error, unload };
};
module.exports = __toCommonJS(src_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useFind,
  useGet
});
