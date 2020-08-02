import {
  IAnyModelType,
  IOptionalIType,
  ModelProperties,
} from 'mobx-state-tree';
import { ExtendedModel, Model, _Model } from './Model';
import { optionateModels } from './utils';

type IModels = {
  [k: string]: IAnyModelType;
};

function createRootStore<
  T extends IModels,
  Keys extends Extract<keyof T, string>
>(models: T) {
  type OptionatedModels = {
    [K in Keys]: IOptionalIType<T[K], T[K]['SnapshotType']>;
  };

  const optionatedModels = optionateModels<OptionatedModels>(models);

  class Root extends Model(optionatedModels as ModelProperties) {}

  return (Root as any) as _Model<OptionatedModels>;
}

export function RootModel<T extends IModels>(models: T) {
  const rootModel = createRootStore(models);

  return ExtendedModel(rootModel, {});
}
