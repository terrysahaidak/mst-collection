import {
  types,
  IAnyType,
  getRoot,
  Instance,
  getParentOfType,
  IAnyComplexType,
  castToSnapshot,
} from 'mobx-state-tree';
import { IStateTreeNode, getType } from 'mobx-state-tree';

const RefsRegistry = new Map();

export function createEntityRef<T extends IAnyType>(
  entityName: string,
  Model: T,
) {
  let currentRegistry: Map<any, any> = RefsRegistry.get(Model);

  if (!currentRegistry) {
    RefsRegistry.set(Model, new Map());
    currentRegistry = RefsRegistry.get(Model);
  }

  const refModel = types
    .model(`${Model.name}Ref`, {
      id: types.number,
    })

    .volatile((self) => ({
      _refId: `${Model.name}Ref-${self.id}`,
    }))

    .views((self: any) => ({
      get current() {
        const entities = getRoot<any>(self).entities;

        if (typeof entities === 'undefined') {
          throw new Error("EntityRef: Couldn't find entities model");
        }

        const entityModel = entities[entityName];

        if (typeof entityModel === 'undefined') {
          throw new Error(
            `EntityRef: Couldn't find entity model with a name ${entityName}`,
          );
        }

        return entityModel.get(self.id) as Instance<T>;
      },
    }))

    .actions((self: any) => ({
      afterCreate() {
        currentRegistry.set(self._refId, self);
      },
    }));

  return types.snapshotProcessor(refModel, {
    preProcessor(snapshot: number | { id: number }) {
      if (typeof snapshot === 'object') {
        return snapshot;
      }

      return {
        id: snapshot,
      };
    },
    postProcessor(snapshot) {
      return snapshot.id;
    },
  });
}

export function getReferenceParentOfType<T extends IAnyComplexType>(
  model: IStateTreeNode,
  parentType: T,
) {
  const type = getType(model);
  const registry = RefsRegistry.get(type);

  if (!registry) {
    return undefined;
  }

  for (let value of registry.values()) {
    try {
      return getParentOfType(value, parentType);
    } catch {}
  }

  return undefined;
}

export function castEntityRef(id: number | string) {
  return castToSnapshot(id as any);
}
