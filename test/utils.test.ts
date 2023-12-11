import { describe, expect, it } from 'vitest';

import { getId, isPaginated, PotentialIds } from '~/utils';

describe('getId()', () => {
  it('should return "id" property from item', () => {
    // given
    const item = { id: 1 };

    // then
    expect(getId(item)).toBe(item.id);
  });

  it('should return "_id" property from item', () => {
    // given
    const item = { _id: 1 };

    // then
    expect(getId(item)).toBe(item._id);
  });

  it('should throw error if no id could be retrieved from item', () => {
    // given
    const item = { name: 1 };

    // then
    expect(() => getId(item as PotentialIds)).toThrow('Unable to retrieve id from item');
  });
});

describe('isPaginated()', () => {
  it('requires total, limit, skip and data array to be paginated', () => {
    // given
    const response = {
      total: 100,
      limit: 10,
      skip: 20,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(true);
  });

  it('otal, limit and skip as "0" is also paginated', () => {
    // given
    const response = {
      total: 0,
      limit: 0,
      skip: 0,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(true);
  });

  it('skip as string is also paginated', () => {
    // given
    const response = {
      total: 100,
      limit: 10,
      skip: '20',
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(true);
  });

  it('missing total is not paginated', () => {
    // given
    const response = {
      limit: 10,
      skip: 20,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('missing limit is not paginated', () => {
    // given
    const response = {
      total: 100,
      skip: 20,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('missing skip is not paginated', () => {
    // given
    const response = {
      total: 100,
      limit: 10,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('non array data is not paginated', () => {
    // given
    const response = {
      total: 100,
      limit: 10,
      skip: 20,
      data: {},
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });
});