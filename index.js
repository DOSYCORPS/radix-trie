"use strict";

const BREAK = "TRIE_BREAK_REDUCE";
const EMPTY_STRING = "";
const util = require("util");
// ex. console.log(util.inspect(trie, false, null));

// a reduce implementation you can "break" out of
const reduce = (accumulator, callback, result) => {
  for (let i = 0; i < accumulator.length; i++) {
    let val = callback(result, accumulator[i], i, accumulator);
    if (val === BREAK) break;
    result = val;
  }
  return result;
};

// funky function to loop backwards over a key, so
// foo, then fo, then f
const reduceReverse = (result, callback) => {
  const end = result;
  let current;
  for (let i = end.length; i > 0; i--) {
    current = end.slice(0, i);
    let val = callback(current, result, i);
    if (val === BREAK) break;
    // if this is reached, it didn't break so return the original
    // if the loop ends here since no match was found
    current = result;

  }
  return current;
};

class Trie {
  constructor(value = null) {
    this.value = value;
    this.store = new Map();
  }

  add(key, value = true, root = this) {
    // if the key exists already, overwrite it
    if (this.store.has(key)) {
      this.store.get(key).value = value; // only overwrite value
      return root;
    }

    let newKeyIndex;
    let looped = false;
    const addKey = reduceReverse(key, (reducedKey, originalKey, currentIndex) => {
      // check for partial collisions
      for (let [originalKey, trie] of this.store) {
        if (originalKey.indexOf(reducedKey) === 0) {
          looped = true;

          // partial match of an existing prefix
          newKeyIndex = currentIndex; // save the current index so we know where to split the key
          if (originalKey === reducedKey) {
            this.store.get(originalKey).add(key.slice(currentIndex), value);
            return BREAK;
          } else {
            // collision found, resave it
            if (reducedKey == key) {
              this.store.set(reducedKey, new Trie(value));
            } else {
              this.store.set(reducedKey, new Trie());
            }
            this.store.get(reducedKey).store.set(originalKey.slice(reducedKey.length), trie)
            this.store.delete(originalKey);

            // save current one too
            if (reducedKey !== key) this.store.get(reducedKey).add(key.slice(currentIndex), value);
          }
        }
      }
    });

    if (addKey === key && !looped) {
      // no other leafs matched or partially matched, so save it here
      this.store.set(key, new Trie(value));
    }

    return root;
  }

  get(key) {
    // if the key exists already, return it
    if (this.store.has(key)) {
      return this.store.get(key).value;
    }

    let getIndex;
    const getKey = reduce(key.split(""), (newKey, letter, currentIndex, array) => {
      // if this iteration of the key exists, get the value from that
      // node with the remaining key's letters
      if (this.store.has(newKey)) {
        getIndex = currentIndex; // save the current index so we know where to split the key
        return BREAK;
      }

      return newKey + letter;
    }, EMPTY_STRING);

    if (this.store.has(getKey)) {
      return this.store.get(getKey).get(key.slice(getIndex));
    } else {
      // no matches
      return null;
    }
  }

  fuzzyGet(getKey,
           matches = [],
           prefix = EMPTY_STRING) {
    for (let [key, trie] of this.store) {
      if (key.indexOf(getKey) === 0 || getKey === null) {
        // when getKey is null, we want all the possible results

        // partial or complete match of the prefix
        if (trie.value !== null) {
          // already end of a word, so let's add it
          matches.push([prefix + key, trie.value]);
        }
        trie.fuzzyGet(null, matches, prefix + key); // get all possible results of child nodes
      }
    }
    return matches;
  }
};

module.exports = Trie;
