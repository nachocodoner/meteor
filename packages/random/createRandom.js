import AleaRandomGenerator from './AleaRandomGenerator'
import createAleaGeneratorWithGeneratedSeed from './createAleaGenerator';

export default function createRandom(generator) {
  // Create a non-cryptographically secure PRNG with a given seed (using
  // the Alea algorithm)
  generator.createWithSeeds = (...seeds) => {
    if (seeds.length === 0) {
      throw new Error('No seeds were provided');
    }
    // Pass through the kuuid and length options from the generator if they exist
    return new AleaRandomGenerator({ 
      seeds,
      kuuid: generator.options && generator.options.kuuid,
      length: generator.options && generator.options.length
    });
  };

  // Used like `Random`, but much faster and not cryptographically
  // secure
  generator.insecure = createAleaGeneratorWithGeneratedSeed({ 
    kuuid: generator.options && generator.options.kuuid,
    length: generator.options && generator.options.length
  });

  return generator;
}
