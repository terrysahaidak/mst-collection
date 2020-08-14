import {
  types,
  getRoot,
  Instance,
  getParentOfType,
  IAnyComplexType,
  castToSnapshot,
  IAnyModelType,
} from 'mobx-state-tree';
import { IStateTreeNode, getType } from 'mobx-state-tree';

const RefsRegistry = new Map<
  IAnyComplexType,
  Map<string, IStateTreeNode>
>();

const createBaseRefModel = <T extends IAnyComplexType>(
  entityName: string,
  Model: T,
  currentRegistry: Map<string, IStateTreeNode>,
) =>
  types
    .model({
      id: types.union(types.string, types.number),
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
            `EntityRef: Couldn't find entity model with a name ${entityName} and id ${self.id}`,
          );
        }

        return entityModel.get(self.id) as Instance<T>;
      },
    }))

    .actions((self) => ({
      afterCreate() {
        if (typeof currentRegistry === 'undefined') {
          throw new Error(
            `EntityRef: Couldn't find registry for ${entityName}`,
          );
        }

        currentRegistry.set(self._refId, self);
      },
    }));

export function createNumberEntityRef<T extends IAnyComplexType>(
  entityName: string,
  Model: T,
) {
  let currentRegistry = RefsRegistry.get(Model);

  if (!currentRegistry) {
    currentRegistry = new Map();
    RefsRegistry.set(Model, currentRegistry);
  }

  const refModel = createBaseRefModel(
    entityName,
    Model,
    currentRegistry,
  )
    .named(`${Model.name}Ref`)
    .props({
      id: types.number,
    });

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

export function createStringEntityRef<T extends IAnyComplexType>(
  entityName: string,
  Model: T,
) {
  let currentRegistry = RefsRegistry.get(Model);

  if (!currentRegistry) {
    currentRegistry = new Map();
    RefsRegistry.set(Model, currentRegistry);
  }

  const refModel = createBaseRefModel(
    entityName,
    Model,
    currentRegistry,
  )
    .named(`${Model.name}Ref`)
    .props({
      id: types.string,
    });

  return types.snapshotProcessor(refModel, {
    preProcessor(snapshot: string | { id: string }) {
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

export function getReferenceParentOfType<T extends IAnyModelType>(
  model: IStateTreeNode,
  parentType: T,
): Array<T['Type']> | undefined {
  const type = getType(model);
  const registry = RefsRegistry.get(type);

  if (!registry) {
    return undefined;
  }

  const parents: T[] = [];

  for (const value of registry.values()) {
    try {
      parents.push(getParentOfType<T>(value, parentType));
    } catch {}
  }

  if (parents.length > 0) {
    return parents;
  }

  return undefined;
}

export function castEntityRef(id: number | string) {
  return castToSnapshot(id as any);
}

export function resolveModelReferences<T extends IAnyModelType>(
  type: T,
): undefined | any[] {
  const registry = RefsRegistry.get(type);

  if (!registry) {
    return undefined;
  }

  return [...registry.values()];
}
