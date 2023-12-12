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
  it('should return true when total, limit, skip and data array are present', () => {
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

  it('should return true when total, limit and skip is "0"', () => {
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

  it('should return true when skip is a string', () => {
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

  it('should return false when total is missing', () => {
    // given
    const response = {
      limit: 10,
      skip: 20,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('should return false when limit is missing', () => {
    // given
    const response = {
      total: 100,
      skip: 20,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('should return false when skip is missing', () => {
    // given
    const response = {
      total: 100,
      limit: 10,
      data: [],
    };

    // then
    expect(isPaginated<typeof response>(response)).toBe(false);
  });

  it('should return false when data is no array', () => {
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
