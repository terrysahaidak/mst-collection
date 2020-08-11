import {
  types,
  getRoot,
  isIdentifierType,
  destroy,
  IAnyModelType,
  IArrayType,
  ISimpleType,
  SnapshotIn,
  Instance,
} from 'mobx-state-tree';
import { normalize, Schema } from 'normalizr';
import { runInAction } from 'mobx';
import { Model } from './';
import { _Model } from './Model';
import { ExtendedModel, view } from './Model';

function reduceNormalize(
  arr: any[],
  idAttribute = 'id',
  entityName: string,
): {
  result: any;
  entities: {
    [k: string]: any;
  };
} {
  const normalized = {
    result: null,
    entities: {
      [entityName]: {},
    },
  };

  arr.reduce((acc, val) => {
    const id = val[idAttribute];

    if (arr.length === 1) {
      acc.result = id;
    } else if (!Array.isArray(acc.result)) {
      acc.result = [acc.result, val];
    } else {
      acc.ids.push(id);
    }

    acc.entities[entityName][id] = val;

    return acc;
  }, normalized);

  return normalized;
}

type ModelAttribute<
  T extends IAnyModelType,
  Keys = keyof Instance<T>
> = ((item: Instance<T>) => string) | Keys;

type ListModelOptions<T extends IAnyModelType> = {
  idAttribute?: Extract<keyof Instance<T>, string>;
  schema?: Schema<any>;
  entityName?: string;
  pageSize?: number;
  reversed?: boolean;
  limit?: number;
  optional?: boolean;
  // useSnapshotProcessor = true,
  fromAttribute?: ModelAttribute<T>;
};

interface ListModelType<T, TS = T | SnapshotIn<T>> {
  readonly pageSize: number | undefined;

  readonly limit: number | undefined;

  /**
   * Converts mst array to regular one and returns it.
   * Useful for some virtualized lists which compares values using references.
   * @returns {array} – regular js array
   */
  readonly asArray: T[];

  readonly first: T | undefined;

  readonly last: T | undefined;

  readonly isEmpty: boolean;

  readonly count: number;

  readonly pageNumber: number | undefined;

  readonly offset: number | undefined;

  readonly from: number | undefined;

  byIndex(index: number): T | undefined;

  includes(item: T): boolean;

  findIndex(item: T): T | undefined;

  findIndexById(id: number | string): T | undefined;

  findById(id: number | string): T | undefined;

  /**
   * Initialize list with an array
   * @param {array} data Array of items
   */
  set(data: any): void;
  /**
   * Add element to end of list
   * @param {any} item
   */
  add(item: TS): void;

  /**
   * Add element to beginning of list
   * @param {any} item
   */
  addToBegin(item: TS): void;

  /**
   * Add each element of the given array to the end of the list
   * @param {array} item Array of elements to add
   */
  append(items: TS[]): void;

  /**
   * Add each element of the given array to the beginning of the list
   * @param {array} item Array of elements to add
   */
  prepend(items: TS[]): void;

  replace(id: string | number, newItem: TS): void;

  remove(item: T, shouldDestroy?: boolean): void;

  removeById(id: string | number, shouldDestroy?: boolean): void;

  removeManyByIds(ids: number[] | string[]): void;

  checkIfHasMore(data: any[]): void;

  setHasNoMore(value: boolean): void;

  clear(): void;
}

/**
 * Returns MST Model with array property and full of useful methods to work
 * with that array.
 *
 * Provides normalization using normalizr or reduce function.
 * If no schema or entityName specified, normalization won't be used.
 * @param {string} name Name of the model
 * @param {object} options options to be passed
 * @property {MSTModel} options.of – The type to be used in array model
 * @property {string} [options.id=id] – Property name to be used to resolve
 * an identifier value
 * @property {Object} [options.schema] – normalizr schema to be used to normalize
 * results
 * @property {number} [options.pageSize] - Amount of elements to be counted as single
 * page. Used to determine if the list has more items to fetch.
 * @property {string} [options.entityName] - Property to be used to identify
 * collection in entities
 * @property {boolean} [options.reversed] - Determines if the list is reversed list.
 * Useful for chats and other reversed lists.
 * @property {boolean} [options.useSnapshotProcessor=true] - Option to use raw model output
 * instead of just an array.
 *
 * @returns {MSTModel} – mobx state tree model
 */
export default function createListModel<
  T extends IAnyModelType,
  O extends ListModelOptions<T>
>(model: T, options: O) {
  const {
    idAttribute = 'id',
    schema,
    entityName,
    pageSize,
    reversed,
    limit,
    fromAttribute,
  } = options;

  /** TODO:
   * 1. Add JSDocs for each property of options
   * 2. Add JSDocs for each method and getter used
   */

  function push(arr: any[], item: any) {
    runInAction(() => {
      if (!Array.isArray(item)) {
        item = [item];
      }

      if (reversed) {
        arr.unshift(...item);
      } else {
        arr.push(...item);
      }
    });
  }

  function unshift(arr: any[], item: any) {
    runInAction(() => {
      if (!Array.isArray(item)) {
        item = [item];
      }

      if (!reversed) {
        arr.unshift(...item);
      } else {
        arr.push(...item);
      }
    });
  }

  class List extends Model({
    array: types.array(model),
    hasNoMore: false,
  }) {
    get pageSize() {
      return pageSize;
    }

    get limit() {
      return limit;
    }

    /**
     * Converts mst array to regular one and returns it.
     * Useful for some virtualized lists which compares values using references.
     * @returns {array} – regular js array
     */
    get asArray() {
      return this.array.slice();
    }

    get first() {
      return this.isEmpty ? undefined : this.array[0];
    }

    get last() {
      return this.isEmpty ? undefined : this.array[this.count - 1];
    }

    get isEmpty() {
      return this.array.length === 0;
    }
    get count() {
      return this.array.length;
    }

    get pageNumber() {
      if (
        typeof pageSize === 'undefined' &&
        typeof limit === 'undefined'
      ) {
        return undefined;
      }

      const divider = pageSize ?? limit;

      // @ts-ignore
      const pages = this.count / divider;

      if (Number.isInteger(pages)) {
        return pages + 1;
      }

      return undefined;
    }

    get offset() {
      if (this.count === 0) {
        return undefined;
      }

      return this.array.length;
    }

    get from() {
      const item = reversed ? this.first : this.last;

      if (!item) {
        return undefined;
      }

      if (typeof fromAttribute === 'string') {
        return item?.[fromAttribute];
      }

      if (typeof fromAttribute === 'function') {
        return fromAttribute(item);
      }

      return typeof item[idAttribute] !== 'undefined'
        ? item[idAttribute]
        : item;
    }

    @view byIndex(index: number) {
      return this.array[index];
    }

    @view includes(item: T) {
      return this.array.includes(item);
    }

    @view findIndex(item: T) {
      return this.array.findIndex((i) => i === item);
    }

    @view findIndexById(id: number | string) {
      return this.array.findIndex((i) => i[idAttribute] === id);
    }

    @view findById(id: number | string) {
      return this.array.find((i) => i[idAttribute] === id);
    }

    /**
     * Initialize list with an array
     * @param {array} data Array of items
     */
    set(data: any) {
      const { result } = this._processData(data);

      if (reversed) {
        this.array.replace(result.reverse());
      } else {
        this.array.replace(result);
      }

      this.checkIfHasMore(data);
    }

    /**
     * Add element to end of list
     * @param {any} item
     */
    add(item: T) {
      const { result } = this._processData([item]);

      push(this.array, result);
    }

    /**
     * Add element to beginning of list
     * @param {any} item
     */
    addToBegin(item: T) {
      const { result } = this._processData([item]);

      unshift(this.array, result);
    }

    /**
     * Add each element of the given array to the end of the list
     * @param {array} item Array of elements to add
     */
    append(items: T[]) {
      const { result } = this._processData(items);

      result.forEach((i: any) => push(this.array, i));

      this.checkIfHasMore(items);
    }

    /**
     * Add each element of the given array to the beginning of the list
     * @param {array} item Array of elements to add
     */
    prepend(items: T[]) {
      const { result } = this._processData(items);

      result.forEach((i: any) => unshift(this.array, i));

      this.checkIfHasMore(items);
    }

    replace(id: string | number, newItem: T) {
      const index = this.findIndexById(id);

      if (index < 0) {
        return;
      }

      const { result } = this._processData([newItem]);

      const [newId] = result;

      this.array[index] = newId;
    }

    remove(item: T, shouldDestroy = false) {
      const index = this.findIndex(item);

      if (index < 0) {
        return;
      }

      this.array.splice(index, 1);

      if (shouldDestroy) {
        destroy(item);
      }
    }

    removeById(id: string | number, shouldDestroy = false) {
      const index = this.findIndexById(id);

      if (index < 0) {
        return;
      }
      this.array.splice(index, 1);

      if (shouldDestroy) {
        const item = this.findById(id);

        if (typeof item !== 'undefined') {
          destroy(item);
        }
      }
    }

    removeManyByIds(ids: number[] | string[]) {
      ids.forEach((id: string | number) => this.removeById(id));
    }

    checkIfHasMore(data: any[]) {
      const lessThanPageSize =
        typeof pageSize !== 'undefined' && data.length < pageSize;
      const lessThanLimit =
        typeof limit !== 'undefined' && data.length < limit;

      if (lessThanPageSize || lessThanLimit) {
        this.hasNoMore = true;
      } else {
        this.hasNoMore = false;
      }
    }

    setHasNoMore(value: boolean) {
      this.hasNoMore = value;
    }

    clear() {
      this.array.replace([]);
    }

    /**
     * Should we normalize the data? Universal method which is used
     * to answer to that question and return object with result field.
     * `result` is the normalized result or the raw data depends if we really need
     * to normalize the data.
     * @param {array} data array of elements
     */
    _processData(data: any) {
      if (
        (!isIdentifierType(data[0]) &&
          typeof entityName !== 'undefined') ||
        typeof schema !== 'undefined'
      ) {
        const { result, entities } = this._normalize(data);

        (getRoot(this) as any).entities.merge(entities);

        return { result };
      }

      return { result: data };
    }

    /**
     * Normalizes data using normalizr or reduceNormalize strategy
     * @param {array} items Data to be normalized
     */
    _normalize(items: any) {
      if (
        typeof schema === 'undefined' ||
        typeof entityName === 'undefined'
      ) {
        throw new Error(
          'ListModel: Cannot run normalize if neither schema or entityName is provided',
        );
      }

      if (typeof entityName === 'string') {
        return reduceNormalize(items, idAttribute, entityName);
      }

      return normalize(items, schema);
    }
  }

  return (List as any) as _Model<
    {
      array: IArrayType<T>;
      hasNoMore: ISimpleType<boolean>;
    },
    ListModelType<T>
  >;
}

export function ListModel<
  T extends IAnyModelType,
  O extends ListModelOptions<T>
>(model: T, options: O) {
  const listModel = createListModel<T, O>(model, options);

  return ExtendedModel(listModel, {});
}

export function useListModelSnapshotProcessor<
  T extends IAnyModelType
>(model: T) {
  return types.snapshotProcessor(
    model,
    {
      preProcessor(snapshot) {
        if (Array.isArray(snapshot)) {
          return {
            array: snapshot || [],
          };
        }

        return snapshot;
      },
      postProcessor(snapshot) {
        return snapshot.array || [];
      },
    },
    model.name,
  );
}
