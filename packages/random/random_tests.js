import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import NodeRandomGenerator from './NodeRandomGenerator';
import BrowserRandomGenerator from './BrowserRandomGenerator';
import createRandom from './createRandom';

Tinytest.add('random', function (test) {
  // Deterministic with a specified seed, which should generate the
  // same sequence in all environments.
  //
  // For repeatable unit test failures using deterministic random
  // number sequences it's fine if a new Meteor release changes the
  // algorithm being used and it starts generating a different
  // sequence for a seed, as long as the sequence is consistent for
  // a particular release.
  const random = Random.createWithSeeds(0);
  test.equal(random.id(), 'cp9hWvhg8GSvuZ9os');
  test.equal(random.id(), '3f3k6Xo7rrHCifQhR');
  test.equal(random.id(), 'shxDnjWWmnKPEoLhM');
  test.equal(random.id(), '6QTjB8C5SEqhmz4ni');
});

// node crypto and window.crypto.getRandomValues() don't let us specify a seed,
// but at least test that the output is in the right format.
Tinytest.add('random - format', function (test) {
  const idLen = 17;
  test.equal(Random.id().length, idLen);
  test.equal(Random.id(29).length, 29);
  const numDigits = 9;
  const hexStr = Random.hexString(numDigits);
  test.equal(hexStr.length, numDigits);
  Number.parseInt(hexStr, 16); // should not throw
  const frac = Random.fraction();
  test.isTrue(frac < 1.0);
  test.isTrue(frac >= 0.0);

  test.equal(Random.secret().length, 43);
  test.equal(Random.secret(13).length, 13);
});

Tinytest.add('random - Alea is last resort', function (test) {
  if (Meteor.isServer) {
    test.isTrue(Random.alea === undefined);
  }
  if (Meteor.isClient) {
    const useGetRandomValues = !!(typeof window !== 'undefined' &&
        window.crypto && window.crypto.getRandomValues);
    test.equal(Random.alea === undefined, useGetRandomValues);
  }
});

Tinytest.add('random - createWithSeeds requires parameters', function (test) {
  test.throws(function () {
    Random.createWithSeeds();
  });
});

Tinytest.add('random - length configuration', function (test) {
  // Create a random generator with a custom default length
  const customLength = 25;
  const RandomGenerator = Meteor.isServer ? 
    require('./NodeRandomGenerator').default : 
    require('./BrowserRandomGenerator').default;
  const randomWithCustomLength = require('./createRandom').default(
    new RandomGenerator({ length: customLength })
  );

  // Test that the default length is used when no length is specified
  const id = randomWithCustomLength.id();
  test.equal(id.length, customLength, 'ID should use the configured default length');

  // Test that an explicit length overrides the default
  const explicitLength = 30;
  const idWithExplicitLength = randomWithCustomLength.id(explicitLength);
  test.equal(idWithExplicitLength.length, explicitLength, 'Explicit length should override default');
});

Tinytest.add('random - Meteor.settings.packages.random options', function (test) {
  // Save original settings
  const originalSettings = Meteor.settings;

  try {
    // Set test settings
    Meteor.settings = {
      packages: {
        random: {
          kuuid: true,
          length: 25
        }
      }
    };

    // Create a new random generator that should use the settings
    const RandomGeneratorClass = Meteor.isServer ? NodeRandomGenerator : BrowserRandomGenerator;
    const randomWithSettings = createRandom(new RandomGeneratorClass());

    // Test that kuuid is enabled via settings
    const id = randomWithSettings.id();
    test.equal(id.length, 25, 'ID should use the length from Meteor.settings');

    // Generate multiple IDs and verify they all have the same prefix pattern
    // (first 8 characters should be the same timestamp-based prefix)
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(randomWithSettings.id());
    }

    // The first 8 characters should be the same for IDs generated in quick succession
    // as they represent the timestamp with second precision (kuuid enabled via settings)
    const prefix = ids[0].substring(0, 6);
    for (let i = 1; i < ids.length; i++) {
      test.equal(ids[i].substring(0, 6), prefix,
        'Timestamp prefix with second precision should be present when kuuid is enabled via settings');
    }

    // Test with kuuid disabled via settings
    Meteor.settings.packages.random.kuuid = false;
    const randomWithKuuidDisabled = createRandom(new RandomGeneratorClass());

    // Generate IDs with kuuid disabled
    const idsWithoutKuuid = [];
    for (let i = 0; i < 5; i++) {
      idsWithoutKuuid.push(randomWithKuuidDisabled.id());
    }

    // IDs should still use the configured length
    test.equal(idsWithoutKuuid[0].length, 25, 'ID should still use the length from Meteor.settings');

    // But they should not have consistent prefixes
    let allPrefixesSame = true;
    const firstPrefix = idsWithoutKuuid[0].substring(0, 8);
    for (let i = 1; i < idsWithoutKuuid.length; i++) {
      if (idsWithoutKuuid[i].substring(0, 8) !== firstPrefix) {
        allPrefixesSame = false;
        break;
      }
    }
    test.isFalse(allPrefixesSame, 'IDs should not have consistent prefixes when kuuid is disabled via settings');
  } finally {
    // Restore original settings
    Meteor.settings = originalSettings;
  }
});
