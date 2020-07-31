import { IModelType, Instance, ModelPropertiesDeclaration, ModelPropertiesDeclarationToProperties } from 'mobx-state-tree';
import { internalModel } from './internalModel';

export const propsSymbol = Symbol('props');
export const modelToExtendSymbol = Symbol('props');

export abstract class BaseModel<
  PROPS extends { [k: string]: any },
> {
  // @ts-ignore
  private [propsSymbol]: PROPS;
}

type AnyClass = {
  new(...args: any): any;
}

interface _Model<PROPS extends ModelPropertiesDeclaration> {
  new(...args: any[]): BaseModel<PROPS> & Instance<IModelType<ModelPropertiesDeclarationToProperties<PROPS>, {}>>;
}

interface _ExtendedModel<SuperModel extends AnyClass, PROPS extends ModelPropertiesDeclaration> {
  new(...args: any[]): InstanceType<SuperModel> & BaseModel<PROPS> & Instance<IModelType<ModelPropertiesDeclarationToProperties<PROPS>, {}>>;
}

export function Model<PROPS extends ModelPropertiesDeclaration>(props: PROPS): _Model<PROPS> {
  class BaseClass {
    [propsSymbol] = props;
  }

  return BaseClass as any;
}

export function ExtendedModel<SuperModel extends _Model<any>, PROPS extends ModelPropertiesDeclaration>(parent: SuperModel, props: PROPS): _ExtendedModel<SuperModel, PROPS> {
  class BaseClass {
    [propsSymbol] = props;
    [modelToExtendSymbol] = parent;
  }

  return BaseClass as any;
}

export function model<PROPS extends ModelPropertiesDeclaration, T extends AnyClass>(klass: {
  new (): BaseModel<PROPS>
} & T) {
  const instance = new klass();

  const m = internalModel(klass) as any;

  type P = typeof instance[typeof propsSymbol]
  type A = Omit<InstanceType<T>, typeof propsSymbol>;;

  return m as IModelType<ModelPropertiesDeclarationToProperties<P>, A>;
}

// export function action(target: { [key: string]: any }, key: string) {
// 	(target.$actions || (target.$actions = {}))[key] = true;
// }
