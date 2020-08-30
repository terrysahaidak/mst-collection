/* eslint-disable @typescript-eslint/ban-types */
import {
  IModelType,
  Instance,
  ModelPropertiesDeclaration,
  ModelPropertiesDeclarationToProperties,
} from 'mobx-state-tree';
import { internalModel } from './internalModel';
import { $nonEmptyObject } from 'mobx-state-tree/dist/internal';

export declare const propsSymbol: unique symbol;
export declare const modelToExtendSymbol: unique symbol;

type AnyObject = { [k: string]: any };
export abstract class BaseModel<PROPS extends AnyObject> {
  // @ts-ignore
  private [propsSymbol]?: PROPS;
}

type AnyClass = {
  new (...args: any): any;
};

export interface _Model<
  PROPS extends ModelPropertiesDeclaration,
  OTHERS = {}
> {
  new (...args: any[]): BaseModel<PROPS> &
    Omit<
      Instance<
        IModelType<
          ModelPropertiesDeclarationToProperties<PROPS>,
          OTHERS
        >
      >,
      typeof $nonEmptyObject
    >;
}

export interface _ExtendedModel<
  SuperModel extends AnyClass,
  PROPS extends ModelPropertiesDeclaration
> {
  new (...args: any[]): InstanceType<SuperModel> &
    BaseModel<PROPS> &
    Omit<
      Instance<
        IModelType<ModelPropertiesDeclarationToProperties<PROPS>, {}>
      >,
      typeof $nonEmptyObject
    >;
}

export function Model<PROPS extends ModelPropertiesDeclaration>(
  props: PROPS,
): _Model<PROPS> {
  class BaseClass {
    [propsSymbol] = props;
  }

  return BaseClass as any;
}

export function ExtendedModel<
  SuperModel extends _Model<any>,
  PROPS extends ModelPropertiesDeclaration
>(
  parent: SuperModel,
  props: PROPS,
): _ExtendedModel<SuperModel, PROPS> {
  class BaseClass {
    [propsSymbol] = props;
    [modelToExtendSymbol] = parent;
  }

  return BaseClass as any;
}

export function model<
  PROPS extends ModelPropertiesDeclaration,
  T extends AnyClass
>(
  klass: {
    new (): BaseModel<PROPS>;
  } & T,
): IModelType<
  InstanceType<typeof klass>[typeof propsSymbol],
  InstanceType<T>
> {
  const m = internalModel(klass) as any;

  return m;
}

export function view(target: { [key: string]: any }, key: string) {
  (target.$views || (target.$views = {}))[key] = true;
}
