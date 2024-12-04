require('dotenv').config();

const { sanitize, validate } = require('../lib/graphqlTableSchema');
const schemaSample = require('./materials/schemaSample.json');

describe('graphqlTableSchema: sanitize', () => {
  test('sanitize', () => {
    const data = {
      __typename: 'a',
      object: {
        nestedArray: [{
          name: 'a',
          value: null,
        }],
        nestedObject: {
          value: null,
        },
      },
      array: [{
        name: 'a',
        nestedArray: [{
          name: '1',
          value: null,
        }],
        item: null,
      }]
    };

    const result = sanitize(data);
    // console.log(JSON.stringify(result, null, 2));
    expect(result).toEqual({
      "object": {
        "nestedArray": [
          {
            "name": "a"
          }
        ],
        "nestedObject": {}
      },
      "array": [
        {
          "name": "a",
          "nestedArray": [
            {
              "name": "1"
            }
          ]
        }
      ]
    });
  });
});

describe('graphqlTableSchema: validate', () => {
  test('no json schema', () => {
    const jsonSchema = null;
    const typeName = '';
    const action = 'update';
    const item = {};

    const result = validate(jsonSchema, typeName, action, item);
    expect(result).toEqual(item);
  });

  test('invalid', () => {
    expect.assertions(1);

    const jsonSchema = schemaSample;
    const typeName = 'Order';
    const action = 'update';
    const item = {
      __typename: typeName,
      id: '7000fc71-c940-4a90-8385-b99dc046ac48',
    };

    try {
      validate(jsonSchema, typeName, action, item);
    } catch (e) {
      expect(e.message).toEqual('input requires property \"date\",input requires property \"datetime\"');
    }
  });


  test('valid w/ empty array', () => {
    const jsonSchema = schemaSample;
    const typeName = 'Order';
    const action = 'update';
    const item = {
      __typename: typeName,
      id: '7000fc71-c940-4a90-8385-b99dc046ac48',
      date: '2024-10-10',
      datetime: '2024-10-10T00:00:00.000Z',
      details: {
        name: 'order-a',
        description: null,
        surcharges: null,
      },
      mealItems: [],
    };

    const result = validate(jsonSchema, typeName, action, item);
    expect(result).toEqual(item);
  });

  test('valid w/ array and empty nested array', () => {
    const jsonSchema = schemaSample;
    const typeName = 'Order';
    const action = 'update';
    const item = {
      __typename: typeName,
      id: '7000fc71-c940-4a90-8385-b99dc046ac48',
      date: '2024-10-10',
      datetime: '2024-10-10T00:00:00.000Z',
      details: {
        name: 'order-a',
        description: null,
        surcharges: [],
      },
      mealItems: [{
        name: 'item',
        quantity: 100,
        price: 1.00,
        surcharges: null,
      }],
    };

    const result = validate(jsonSchema, typeName, action, item);
    expect(result).toEqual(item);
  });

  test('valid w/ array and nested array', () => {
    const jsonSchema = schemaSample;
    const typeName = 'Order';
    const action = 'update';
    const item = {
      __typename: typeName,
      id: '7000fc71-c940-4a90-8385-b99dc046ac48',
      date: '2024-10-10',
      datetime: '2024-10-10T00:00:00.000Z',
      details: {
        name: 'order-a',
        description: 'something',
        surcharges: [{
          name: 'a',
          price: 1,
        }],
      },
      mealItems: [{
        name: 'item',
        quantity: 100,
        price: 1.00,
        surcharges: [{
          name: 'a',
          price: 1,
        }],
      }],
    };

    const result = validate(jsonSchema, typeName, action, item);
    expect(result).toEqual(item);
  });


});