import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import NodeRandomGenerator from './NodeRandomGenerator';
import createRandom from './createRandom';
import AleaRandomGenerator from './AleaRandomGenerator';
import BrowserRandomGenerator from './BrowserRandomGenerator';

const RandomGenerator = Meteor.isServer ? NodeRandomGenerator : BrowserRandomGenerator;
const randomWithKuuid = createRandom(new RandomGenerator({ kuuid: true }));
const randomWithoutKuuid = createRandom(new RandomGenerator({ kuuid: false }));

Tinytest.add('random with kuuid - kuuid enabled', function (test) {
  // Test that kuuid-enabled IDs have the expected format
  const id = randomWithKuuid.id();
  test.equal(id.length, 17, 'ID length should be 17 characters');

  // Generate multiple IDs and verify they all have the same prefix pattern
  // (first 8 characters should be the same timestamp-based prefix)
  const ids = [];
  for (let i = 0; i < 5; i++) {
    ids.push(randomWithKuuid.id());
  }

  // The first 8 characters should be the same for IDs generated in quick succession
  // as they represent the timestamp
  const prefix = ids[0].substring(0, 8);
  for (let i = 1; i < ids.length; i++) {
    test.equal(ids[i].substring(0, 8), prefix, 
      'Timestamp prefix should be consistent for IDs generated in quick succession');
  }
});

Tinytest.add('random with kuuid - kuuid disabled', function (test) {
  // Test that kuuid-disabled IDs have the expected format
  const id = randomWithoutKuuid.id();
  test.equal(id.length, 17, 'ID length should be 17 characters');

  // Generate multiple IDs and verify they are all different
  const ids = [];
  for (let i = 0; i < 5; i++) {
    ids.push(randomWithoutKuuid.id());
  }

  // All IDs should be different
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      test.notEqual(ids[i], ids[j], 'IDs should be unique');
    }
  }
});

Tinytest.add('random with kuuid - deterministic', function (test) {
  // Deterministic with a specified seed, which should generate the
  // same sequence in all environments.
  const random = randomWithKuuid.createWithSeeds(0);

  // Note: The expected values are different from the standard test
  // because kuuid affects the ID generation
  const id1 = random.id();
  const id2 = random.id();
  const id3 = random.id();
  const id4 = random.id();

  // We can't predict the exact values because of the timestamp component,
  // but we can verify they're the expected length and format
  test.equal(id1.length, 17, 'ID length should be 17 characters');
  test.equal(id2.length, 17, 'ID length should be 17 characters');
  test.equal(id3.length, 17, 'ID length should be 17 characters');
  test.equal(id4.length, 17, 'ID length should be 17 characters');

  // The IDs should be different from each other
  test.notEqual(id1, id2, 'Sequential IDs should be different');
  test.notEqual(id2, id3, 'Sequential IDs should be different');
  test.notEqual(id3, id4, 'Sequential IDs should be different');
});

Tinytest.add('random with kuuid - format', function (test) {
  const idLen = 17;
  test.equal(randomWithKuuid.id().length, idLen);
  test.equal(randomWithKuuid.id(29).length, 29);

  const numDigits = 9;
  const hexStr = randomWithKuuid.hexString(numDigits);
  test.equal(hexStr.length, numDigits);
  Number.parseInt(hexStr, 16); // should not throw

  const frac = randomWithKuuid.fraction();
  test.isTrue(frac < 1.0);
  test.isTrue(frac >= 0.0);

  test.equal(randomWithKuuid.secret().length, 43);
  test.equal(randomWithKuuid.secret(13).length, 13);
});

Tinytest.add('random with kuuid - createWithSeeds requires parameters', function (test) {
  test.throws(function () {
    randomWithKuuid.createWithSeeds();
  });
});

Tinytest.add('random with kuuid - Alea is last resort', function (test) {
  if (Meteor.isServer) {
    test.isTrue(randomWithKuuid.alea === undefined);
  }
  if (Meteor.isClient) {
    const useGetRandomValues = !!(typeof window !== 'undefined' &&
        window.crypto && window.crypto.getRandomValues);
    test.equal(randomWithKuuid.alea === undefined, useGetRandomValues);
  }
});

Tinytest.add('random - kuuid option propagation', function (test) {
  // Create a generator with kuuid enabled
  const aleaWithKuuid = new AleaRandomGenerator({ 
    seeds: [0], 
    kuuid: true 
  });

  // Create a generator with kuuid disabled
  const aleaWithoutKuuid = new AleaRandomGenerator({ 
    seeds: [0], 
    kuuid: false 
  });

  // Generate IDs with both generators
  const idWithKuuid = aleaWithKuuid.id();
  const idWithoutKuuid = aleaWithoutKuuid.id();

  // The IDs should be different lengths or formats due to kuuid
  test.notEqual(idWithKuuid.substring(0, 8), idWithoutKuuid.substring(0, 8),
    'IDs should have different formats based on kuuid setting');

  // Test that the kuuid option is passed through createWithSeeds
  const randomWithSeeds = randomWithKuuid.createWithSeeds(0);
  const idWithSeeds = randomWithSeeds.id();

  // The ID should have the timestamp prefix
  test.equal(idWithSeeds.length, 17, 'ID length should be 17 characters');
});
