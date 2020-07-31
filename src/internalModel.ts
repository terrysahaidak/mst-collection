import { propsSymbol, modelToExtendSymbol } from './Model';
import {
  types as t,
} from 'mobx-state-tree';


type Views = {
  [k: string]: PropertyDescriptor
}

type Actions = {
  [k: string]: (...args: any[]) => void
}

type Volatile = {
  [k: string]: any
}

export function getOwnPropertyDescriptors(obj: object): PropertyDescriptorMap {
  return Object.getOwnPropertyDescriptors(obj);
}

function hasKeys(obj: object): boolean {
  return !!Object.keys(obj).length;
}

function binder(fns: { [k:string]: Function }) {
  return (obj: object) =>
    Object.entries(fns).reduce((acc, [fnName, fn]) => {
      if (typeof fn !== 'function') {
        throw new Error(`${fnName} must be function`);
      }

      acc[fnName] = fn.bind(obj);
      return acc;
    }, {} as any);
}

function viewBinder(descs: Views) {
  return (obj: object) =>
    Object.entries(descs).reduce((fns, [key, desc]) => {
      desc = descBind(obj, desc, 'get');
      desc = descBind(obj, desc, 'set');
      desc = descBind(obj, desc, 'value');
      desc = { ...desc, enumerable: true };
      return Object.defineProperty(fns, key, desc);
    }, {});
}

function descBind(obj: object, desc: any, fnName: string) {
  const fn = desc[fnName];
  if (typeof fn !== 'function') return desc;
  return { ...desc, [fnName]: fn.bind(obj) };
}


export function internalModel(Class: new () => any): any {
  const instance = new Class();
  // extracting snapshot processors 
  // const { preProcessSnapshot, postProcessSnapshot } = instance;
  // and removing them from the instance 
  // delete instance["preProcessSnapshot"];
  // delete instance["postProcessSnapshot"];

  // getting all the model props
  const modelDefinition = instance[propsSymbol] || {};
  const extendsModel = instance[modelToExtendSymbol];
  // and removing them from the instance  
  delete instance[propsSymbol];
  delete instance[modelToExtendSymbol];

  const descriptors = getOwnPropertyDescriptors(Class.prototype);
  const descriptorsEntries = Object.entries(descriptors).filter(
    ([key]) => key !== 'constructor',
  );
  const instanceEntries = Object.entries(instance);

  // for storing
  const views: Views = {};
  const actions: Actions = {
    __update(cb: () => void) {
      cb();
    },
  };
  const volatile: Volatile = {};

  const thunks: { [k: string]: any } = {};

  // extracting thunks and local state
  instanceEntries.forEach(([key, value]) => {
    // @ts-ignore
    if (value.isType) {
      // thunks
      thunks[key] = value; 
    } else if (typeof value !== 'undefined') {
      // local state (volatile)
      volatile[key] = value;
    }
  });

  // extracting views and actions
  descriptorsEntries.forEach(([key, desc]) => {
    const { get, set, value } = desc;

    if (get || set) {
      views[key] = desc;
    } else if (typeof value === 'function') {
      actions[key] = value;
    }
  });

  // actual model
  let ActualModel = t.model(Class.name, modelDefinition);

  if (hasKeys(volatile)) {
    ActualModel = ActualModel.volatile(() => volatile);
  }

  if (hasKeys(actions)) {
    ActualModel = ActualModel.actions(binder(actions));
  }

  if (hasKeys(views)) {
    ActualModel = ActualModel.views(viewBinder(views));
  }

  if (Object.keys(thunks).length > 0) {
    ActualModel = ActualModel.props(thunks);
  }

  // if (preProcessSnapshot) {
  //   ActualModel = ActualModel.preProcessSnapshot(preProcessSnapshot);
  // }

  // if (postProcessSnapshot) {
  //   ActualModel = ActualModel.postProcessSnapshot(
  //     postProcessSnapshot,
  //   );
  // }

  if (extendsModel) {
    return t.compose(
      internalModel(extendsModel),
      ActualModel,
    ).named(Class.name);
  }

  return ActualModel;
}
