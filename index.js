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

const set = function(key, value) {
  if (value instanceof Trie) {
    this.store.set(key, value);
  } else {
    this.store.set(key, new Trie(value));
  }
}

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

    let didNotloop = true;
    const addKey = reduceReverse(key, (reducedKey, originalAddKey, currentIndex) => {
      // check for partial collisions over all existing keys
      for (let [originalKey, trie] of this.store) {
        if (originalKey.indexOf(reducedKey) === 0) {
          // partial match of an existing prefix

          didNotloop = false;
          if (originalKey === reducedKey) {
            // exact match found
            this.store.get(originalKey).add(key.slice(currentIndex), value);
          } else {
            // partial collision found
            if (reducedKey == key) {
              // the reducedKey is the full key we are inserting, so add the value
              set.call(this, reducedKey, value);
            } else {
              set.call(this, reducedKey);
            }
            // set the exiting collided-with key/value
            set.call(this.store.get(reducedKey), originalKey.slice(reducedKey.length), trie);
            this.store.delete(originalKey); // clean up and delete the old one

            // save current one too if there are more letters in the key
            // that still need to be added
            if (reducedKey !== key) this.store.get(reducedKey).add(key.slice(currentIndex), value);
          }
          // no need to keep iterating, found the largest common prefix
          return BREAK;
        }
      }
    });

    if (addKey === key && didNotloop) {
      // no other leafs matched or partially matched, so save it here
      set.call(this, key, value);
    }

    return root;
  }

  delete(key, root = this) {
    // if the key exists already, delete it
    if (this.store.has(key)) {
      const trie = this.store.get(key);

      if (trie.store.size) {
        // has other nodes branching off, so just remove value
        console.log("HIT", key);
        trie.value = null;
        return root === this ? root : this.store.size === 1; // if it equals 1, it is a redundant edge

      } else {


        // no other nodes, remove the whole entry
        this.store.delete(key);
        console.log("HIT2", key, this.store.size === 1 && this.value === null, root === this);
        return root === this ? root : this.store.size === 1 && this.value === null; // if it equals 1, it is a redundant edge
      }
    } else {
      // check for partial hits
      let result;
      let delKey;
      let rkey;
      reduceReverse(key, (reducedKey, originalDeleteKey, currentIndex) => {
        // check for partial collisions over all existing keys
        for (let [originalKey, trie] of this.store) {
          if (originalKey === reducedKey) {
            const trie = this.store.get(originalKey);

            delKey = originalKey;
            rkey = originalDeleteKey.slice(reducedKey.length);
            result = this.store.get(reducedKey).delete(originalDeleteKey.slice(reducedKey.length), root);

            return BREAK;
          }
        }
      });
      if (result === true) {
        // only one child node was left, consolidate it
        console.log("CONS", delKey, rkey)
        set.call(this, delKey + this.store.get(delKey).store.keys().next().value, this.store.get(delKey).store.values().next().value);
        this.store.delete(delKey);
      }
    }

    return root;
  }

  get(key) {
    // if the key exists already, return it
    if (this.store.has(key)) {
      console.log("HIIIT", this.store.get(key).value);
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
      console.log("NEW", this.store.get(getKey).get(key.slice(getIndex)))
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
